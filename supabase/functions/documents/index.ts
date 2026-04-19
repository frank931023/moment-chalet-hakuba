/**
 * POST /functions/v1/documents
 *
 * 上傳文件到知識庫（RAG）。
 * 接收純文字內容，自動切割成 chunks，呼叫 OpenAI Embeddings API 產生向量，
 * 存入 Supabase documents 資料表。
 *
 * Request body:
 * {
 *   title: string,          // 文件標題
 *   content: string,        // 文件全文
 *   metadata?: object,      // 選填：{ source, category, locale, ... }
 *   chunk_size?: number,    // 每個 chunk 的字元數，預設 500
 *   chunk_overlap?: number  // chunk 重疊字元數，預設 50
 * }
 *
 * 需要 Admin JWT（Authorization: Bearer <token>）
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
}

// ── 文字切割（sliding window chunks）────────────────────────────────────────

function splitIntoChunks(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end).trim())
    if (end === text.length) break
    start += chunkSize - overlap
  }

  return chunks.filter((c) => c.length > 20) // 過濾太短的 chunk
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
      model: 'text-embedding-3-small', // 1536 維，便宜且效果好
      input: text,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Embedding API error: ${JSON.stringify(err)}`)
  }

  const data = await res.json()
  return data.data[0].embedding as number[]
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  const llmApiKey = Deno.env.get('LLM_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!llmApiKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // 驗證 Admin JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // ── DELETE：刪除文件 ──────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = await req.json().catch(() => ({}))
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing document id' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // ── POST：上傳文件 ────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: {
    title?: string
    content?: string
    metadata?: Record<string, unknown>
    chunk_size?: number
    chunk_overlap?: number
  }

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { title, content, metadata = {}, chunk_size = 500, chunk_overlap = 50 } = body

  if (!title || !content) {
    return new Response(JSON.stringify({ error: 'Missing required fields: title, content' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const chunks = splitIntoChunks(content, chunk_size, chunk_overlap)
    const inserted: string[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const embedding = await getEmbedding(chunk, llmApiKey)

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title,
          content: chunk,
          embedding,
          metadata: { ...metadata, chunk_index: i, total_chunks: chunks.length },
        })
        .select('id')
        .single()

      if (error) throw error
      inserted.push(data.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunks_created: inserted.length,
        document_ids: inserted,
      }),
      { status: 201, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to process document', message: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
