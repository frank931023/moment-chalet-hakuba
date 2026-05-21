#!/usr/bin/env node
/**
 * Seed the `documents` table with RAG knowledge-base content.
 *
 * For each text chunk below:
 *   1. Call OpenAI text-embedding-3-small  → 1536-dim vector
 *   2. INSERT into Supabase `documents`    → (title, content, embedding, metadata)
 *
 * Reads VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENAI_API_KEY from .env.
 *
 * Cost: ~15 short chunks × ~150 tokens = ~2250 tokens.
 *       text-embedding-3-small = $0.02 / 1M tokens  →  this run = ~$0.00005 (五千分之一美金)
 *
 * Idempotent: clears the documents table before inserting.
 *
 * Usage:  node scripts/seed-rag.mjs
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── .env loader ────────────────────────────────────────────────
function loadEnv(path) {
  try {
    const text = readFileSync(path, 'utf8')
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const key = line.slice(0, eq).trim()
      let val = line.slice(eq + 1).trim()
      if (!val.startsWith('"') && !val.startsWith("'")) {
        const hashIdx = val.indexOf(' #')
        if (hashIdx > 0) val = val.slice(0, hashIdx).trim()
      }
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    }
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
}
loadEnv(join(ROOT, '.env'))
loadEnv(join(ROOT, '.env.local'))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

const SKIP_EMBEDDINGS = process.argv.includes('--no-embeddings')

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}
if (!SKIP_EMBEDDINGS && (!OPENAI_KEY || OPENAI_KEY.startsWith('your_') || !OPENAI_KEY.startsWith('sk-'))) {
  console.error('❌ OPENAI_API_KEY in .env looks invalid (must start with "sk-")')
  console.error('   Pass --no-embeddings to seed text without OpenAI calls.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Knowledge base content ─────────────────────────────────────
// 每一筆 = 一段獨立的小知識；前端 RAG 搜尋時會撈最相關的 4 筆塞進 prompt。
const DOCUMENTS = [
  // ── 入退房 ──
  {
    title: '入住與退房時間',
    content:
      '所有 Moment Chalet Hakuba 民宿的入住時間為下午 15:00,退房時間為上午 11:00。如需延後退房或提早入住,請於入住前一日聯絡櫃台,我們將視當日狀況協助安排,可能酌收額外費用。深夜抵達(22:00 後)請務必事先通知。',
    metadata: { category: 'policy', locale: 'zh-TW' },
  },
  {
    title: 'Check-in & Check-out Times',
    content:
      'Standard check-in time is 3:00 PM and check-out is 11:00 AM at all Moment Chalet Hakuba properties. Late check-out or early check-in must be requested at least one day in advance and is subject to availability. Please notify the front desk if you expect to arrive after 10:00 PM.',
    metadata: { category: 'policy', locale: 'en' },
  },

  // ── 取消與退款 ──
  {
    title: '取消與退款政策',
    content:
      '入住前 14 天以上取消:全額退款。入住前 7-13 天取消:退款 50%。入住前 6 天以內或未到場(no-show):不予退款。退款將於 5-10 個工作天內退回原付款方式。',
    metadata: { category: 'policy', locale: 'zh-TW' },
  },

  // ── 早餐 ──
  {
    title: '早餐供應與選項',
    content:
      'Chalet A、B、C、E、F、G、I 七間民宿提供早餐加購服務,供應時間 7:30-9:00。可選日式定食(白飯、味噌湯、烤魚、漬物、玉子燒)或西式套餐(吐司、火腿蛋、沙拉、咖啡或紅茶)。Chalet D 與 Chalet H 不提供早餐,但附近徒步 5 分鐘內有多家早餐店。素食、過敏需求請於訂房時備註。',
    metadata: { category: 'facility', locale: 'zh-TW' },
  },

  // ── 設施 ──
  {
    title: '客房內設施',
    content:
      '全館提供免費 WiFi、暖氣、毛巾與基本盥洗備品(牙刷、洗髮精、潤髮乳、沐浴乳、肥皂)、吹風機、平面電視。部分房型另有浴缸、露天風呂、迷你廚房、洗衣機、囲炉裏(古民家房型)。每間民宿都備有滑雪板與滑雪鞋的乾燥室。',
    metadata: { category: 'facility', locale: 'zh-TW' },
  },
  {
    title: '停車場',
    content:
      '所有民宿均提供免費停車位,每間客房可停一台車。停車場位於建築物旁或地下,冬季備有除雪。租車的旅客請於訂房時告知車型,以便保留適合的車位。電動車充電請事先詢問,部分民宿提供 J1772 普通充電。',
    metadata: { category: 'facility', locale: 'zh-TW' },
  },

  // ── 滑雪場 ──
  {
    title: '附近滑雪場 — 白馬八方尾根',
    content:
      '白馬八方尾根滑雪場是白馬村最大、最知名的滑雪場,擁有 16 條纜車與超過 200 公頃的雪域。Chalet B 距離纜車站徒步約 5 分鐘,是滑雪客的首選。其他民宿可搭乘村內免費接駁巴士(冬季每 20 分鐘一班)前往。雪季為每年 12 月初至 5 月初。',
    metadata: { category: 'area', locale: 'zh-TW' },
  },
  {
    title: '附近滑雪場 — 白馬岩岳與白馬五竜',
    content:
      '白馬岩岳滑雪場以家庭友善的緩坡聞名,Chalet C 距離車程僅 5 分鐘。夏季有岩岳 Mountain Resort 的山頂景觀餐廳 HAKUBA MOUNTAIN HARBOR,可眺望北アルプス山脈。白馬五竜滑雪場有高山植物園與夜間滑雪,Chalet E 距離車程 8 分鐘。',
    metadata: { category: 'area', locale: 'zh-TW' },
  },

  // ── 交通 ──
  {
    title: '從東京前往白馬村',
    content:
      '建議路線:東京站搭新幹線「はくたか」或「かがやき」至長野站(約 1 小時 30 分),轉乘 Alpico 巴士至白馬八方バスターミナル(約 1 小時)。或搭直達巴士「白馬・栂池ライナー」從新宿西口直達白馬,車程約 5 小時。冬季有從成田機場與羽田機場出發的滑雪巴士直達白馬。',
    metadata: { category: 'transport', locale: 'zh-TW' },
  },
  {
    title: '從長野站接駁服務',
    content:
      'Moment Chalet Hakuba 提供從長野站的付費接駁服務,單程每車 ¥8,000(最多 4 人),需於入住前 3 天預訂。冬季旺季(12 月 25 日至 1 月 5 日、農曆春節期間)價格上調 20%。也可選擇搭乘 Alpico 巴士(¥2,200 / 人單程)後步行至民宿,或於白馬八方バスターミナル招計程車。',
    metadata: { category: 'transport', locale: 'zh-TW' },
  },

  // ── 餐廳與周邊 ──
  {
    title: '推薦餐廳與酒吧',
    content:
      '白馬村中心地區(Chalet A、F 周邊)有多家餐廳,推薦:「そば神」手打蕎麥麵、「The Pub」英式酒吧、「Tracks Bar」滑雪客聚集地、「鶴喜そば」百年老店。素食友善:「Hummingbird」。日式燒肉:「居酒屋 がぶり寄り」。八方地區(Chalet B 周邊)以滑雪後的酒吧聞名,夜生活熱鬧。',
    metadata: { category: 'area', locale: 'zh-TW' },
  },

  // ── 季節活動 ──
  {
    title: '夏季與綠色季節活動',
    content:
      '5 月至 11 月為白馬村的綠色季節。熱門活動:八方池健行(海拔 2,060m,可眺望白馬三山)、白馬岩岳的天空步道、姫川源流自然散策路、滑翔傘體驗、登山自行車。Chalet D 與 Chalet I 周邊有森林步道,適合家庭親子健行。9-10 月為紅葉季。',
    metadata: { category: 'area', locale: 'zh-TW' },
  },

  // ── 寵物與小孩 ──
  {
    title: '寵物與兒童政策',
    content:
      '目前所有 Moment Chalet Hakuba 民宿均不接受寵物入住,造成不便敬請見諒。歡迎攜帶兒童,6 歲以下與成人同床免費。提供嬰兒床(需於訂房時申請,免費,先到先得)、兒童餐具、防護插座蓋。家庭房型(Family Room)可容納最多 5 人,適合 2 大 3 小或 3 大 2 小。',
    metadata: { category: 'policy', locale: 'zh-TW' },
  },

  // ── 付款與發票 ──
  {
    title: '付款方式與發票',
    content:
      '線上預訂透過 PayPal 結帳,接受 Visa、Mastercard、JCB、American Express 與 PayPal 帳戶餘額。費用以日圓(JPY)計算。可於訂房確認信中索取電子收據;若需公司發票(Tax Invoice),請於入住前透過 Email 提供公司全名、地址、稅號。',
    metadata: { category: 'policy', locale: 'zh-TW' },
  },

  // ── 緊急聯絡 ──
  {
    title: '24 小時緊急聯絡',
    content:
      '入住期間 24 小時緊急電話:+81-261-XXX-XXXX(管家代表電話)。一般詢問請寄 hello@momentchalethakuba.com,工作時間 09:00-18:00 (JST) 內回覆。醫療緊急請撥 119(救護車),警察事故請撥 110。最近的白馬村診所位於村役場旁,徒步 10 分鐘。',
    metadata: { category: 'support', locale: 'zh-TW' },
  },
]

// ── OpenAI embedding ───────────────────────────────────────────
async function getEmbedding(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI ${res.status}: ${errText}`)
  }
  const data = await res.json()
  return { embedding: data.data[0].embedding, tokens: data.usage?.total_tokens ?? 0 }
}

// ── Run ────────────────────────────────────────────────────────
async function main() {
  console.log(`Seeding RAG knowledge base → ${SUPABASE_URL}\n`)

  // Wipe
  process.stdout.write('→ clearing documents table ... ')
  const { error: delErr } = await supabase.from('documents').delete().not('id', 'is', null)
  if (delErr) {
    console.log('FAIL')
    console.error(`   ${delErr.message}`)
    if (delErr.code === '42P01') {
      console.error('   The documents table does not exist.')
      console.error('   Apply supabase/migrations/004_rag_documents.sql via Supabase SQL Editor first.')
    }
    process.exit(1)
  }
  console.log('ok')

  if (SKIP_EMBEDDINGS) {
    console.log('  (--no-embeddings: skipping OpenAI calls, inserting with NULL embedding)\n')
  }

  let totalTokens = 0
  for (let i = 0; i < DOCUMENTS.length; i++) {
    const doc = DOCUMENTS[i]
    const label = `[${i + 1}/${DOCUMENTS.length}] ${doc.title}`
    process.stdout.write(`→ ${label} ... `)
    try {
      let embedding = null
      if (!SKIP_EMBEDDINGS) {
        const r = await getEmbedding(doc.content)
        embedding = r.embedding
        totalTokens += r.tokens
      }

      const { error } = await supabase.from('documents').insert({
        title: doc.title,
        content: doc.content,
        embedding,
        metadata: doc.metadata,
      })
      if (error) throw error
      console.log(SKIP_EMBEDDINGS ? 'ok' : `ok (${totalTokens > 0 ? totalTokens + 't total' : ''})`)
    } catch (err) {
      console.log('FAIL')
      console.error(`   ${err.message}`)
      process.exit(1)
    }
  }

  console.log(`\n✓ Seeded ${DOCUMENTS.length} documents.`)
  if (!SKIP_EMBEDDINGS) {
    const costUsd = (totalTokens / 1_000_000) * 0.02
    console.log(`  Embedding tokens: ${totalTokens} → cost ≈ $${costUsd.toFixed(6)} USD`)
  } else {
    console.log(`  embedding column is NULL — RAG vector search will skip these rows`)
    console.log(`  re-run without --no-embeddings after adding OpenAI billing to enable retrieval`)
  }
  console.log(`\nView in Supabase Dashboard → Table Editor → documents`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
