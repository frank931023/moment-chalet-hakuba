/**
 * POST /functions/v1/chat
 *
 * RAG-enhanced chatbot：
 * 1. 將使用者問題轉成 embedding
 * 2. 從 documents 資料表搜尋相關知識（向量相似度）
 * 3. 將搜尋結果注入 system prompt（Retrieval-Augmented Generation）
 * 4. 呼叫 OpenAI 生成回覆
 * 5. 寫入 chat_logs 與 llm_usage_snapshots
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Locale = 'zh-TW' | 'en' | 'ja'

// ── System prompt（基礎角色設定）────────────────────────────────────────────

function getBaseSystemPrompt(locale: Locale): string {
  if (locale === 'zh-TW') {
    return `你是 Moment Chalet Hakuba 的客服助理。Moment Chalet Hakuba 是位於日本白馬村的民宿集團，共有九間民宿。
請用繁體中文回答旅客的問題。
若旅客詢問具體訂單資訊，請引導他們使用「訂單查詢」功能。
保持友善、專業的語氣，回答簡潔明瞭。
如果知識庫中沒有相關資訊，請誠實告知並建議旅客直接聯絡民宿。`
  }

  if (locale === 'ja') {
    return `あなたは Moment Chalet Hakuba のカスタマーサポートアシスタントです。Moment Chalet Hakuba は日本の白馬村にある民宿グループで、9軒の宿泊施設があります。
日本語でお客様のご質問にお答えください。
具体的な予約情報についてのお問い合わせは、「予約確認」機能をご利用いただくようご案内ください。
親切でプロフェッショナルなトーンを保ち、簡潔にお答えください。
知識ベースに情報がない場合は、正直にお伝えし、直接宿にお問い合わせいただくようご案内ください。`
  }

  return `You are a customer support assistant for Moment Chalet Hakuba, a group of nine guesthouses located in Hakuba Village, Japan.
Please answer guests' questions in English.
If guests ask about specific booking details, guide them to use the "My Booking" lookup feature.
Maintain a friendly and professional tone, and keep responses concise.
If the knowledge base doesn't contain relevant information, honestly say so and suggest contacting the property directly.`
}

// ── 組合含 RAG 上下文的完整 system prompt ────────────────────────────────────

function buildSystemPromptWithContext(
  locale: Locale,
  retrievedDocs: Array<{ title: string; content: string; similarity: number }>
): string {
  const base = getBaseSystemPrompt(locale)

  if (retrievedDocs.length === 0) {
    return base
  }

  const contextSection = retrievedDocs
    .map((doc, i) => `[${i + 1}] ${doc.title}\n${doc.content}`)
    .join('\n\n---\n\n')

  const contextHeader: Record<Locale, string> = {
    'zh-TW': '以下是從知識庫中找到的相關資訊，請優先根據這些資訊回答：',
    'en': 'The following relevant information was retrieved from the knowledge base. Please prioritize this when answering:',
    'ja': '以下は知識ベースから取得した関連情報です。回答の際はこちらを優先してください：',
  }

  return `${base}\n\n${contextHeader[locale]}\n\n${contextSection}`
}

// ── 呼叫 OpenAI Embeddings API ───────────────────────────────────────────────

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })

  if (!res.ok) {
    throw new Error(`Embedding API error: ${res.status}`)
  }

  const data = await res.json()
  return data.data[0].embedding as number[]
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const llmApiKey = Deno.env.get('LLM_API_KEY') ?? Deno.env.get('OPENAI_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!llmApiKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: { session_id?: string; message?: string; locale?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { session_id, message, locale } = body

  if (!session_id || !message) {
    return new Response(JSON.stringify({ error: 'Missing required fields: session_id, message' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const validLocales: Locale[] = ['zh-TW', 'en', 'ja']
  const resolvedLocale: Locale = validLocales.includes(locale as Locale) ? (locale as Locale) : 'en'

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // ── Step 1：將使用者問題轉成 embedding ──────────────────────────────────
    const queryEmbedding = await getEmbedding(message, llmApiKey)

    // ── Step 2：從 documents 搜尋相關知識（RAG Retrieval）──────────────────
    const { data: retrievedDocs, error: searchError } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: 0.65,  // 相似度門檻（0~1，越高越嚴格）
      match_count: 4,          // 最多取 4 筆相關文件
    })

    if (searchError) {
      console.error('Vector search error:', searchError)
    }

    const docs = (retrievedDocs ?? []) as Array<{
      id: string
      title: string
      content: string
      metadata: Record<string, unknown>
      similarity: number
    }>

    // ── Step 3：組合含 RAG 上下文的 system prompt ───────────────────────────
    const systemPrompt = buildSystemPromptWithContext(resolvedLocale, docs)

    // ── Step 4：呼叫 OpenAI Chat Completions ────────────────────────────────
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llmApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 1024,
        temperature: 0.5, // RAG 模式下降低 temperature，讓回答更貼近文件
      }),
    })

    if (!openaiRes.ok) {
      const errData = await openaiRes.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: 'LLM API error', details: errData }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const openaiData = await openaiRes.json()
    const reply = openaiData.choices?.[0]?.message?.content as string ?? ''
    const tokensInput: number = openaiData.usage?.prompt_tokens ?? 0
    const tokensOutput: number = openaiData.usage?.completion_tokens ?? 0
    const tokensUsed: number = openaiData.usage?.total_tokens ?? 0

    // ── Step 5：寫入 chat_logs ───────────────────────────────────────────────
    await supabase.from('chat_logs').insert([
      { session_id, role: 'user', content: message, tokens_used: 0 },
      { session_id, role: 'assistant', content: reply, tokens_used: tokensUsed },
    ])

    // ── Step 6：寫入 llm_usage_snapshots ────────────────────────────────────
    // text-embedding-3-small: $0.02/1M tokens
    // gpt-4o-mini input: $0.15/1M tokens, output: $0.60/1M tokens
    const embeddingTokens = message.length / 4 // 粗估
    const costUsd =
      (embeddingTokens * 0.00000002) +
      (tokensInput * 0.00000015) +
      (tokensOutput * 0.0000006)

    await supabase.from('llm_usage_snapshots').insert({
      provider: 'openai',
      model: 'gpt-4o-mini',
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      cost_usd: costUsd,
    })

    return new Response(
      JSON.stringify({
        reply,
        tokens_used: tokensUsed,
        sources_used: docs.length, // 告訴前端用了幾筆知識庫資料
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
