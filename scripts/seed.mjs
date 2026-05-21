#!/usr/bin/env node
/**
 * Seed the Supabase database with dummy data so the app can run end-to-end.
 *
 * Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env (or
 * environment) and inserts: properties, room types, sample bookings, and a
 * couple of blocked-date ranges.
 *
 * Idempotent — running twice produces the same final state because we delete
 * existing rows from the seeded tables first.
 *
 * Usage:
 *   node scripts/seed.mjs
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Tiny .env loader (no extra dep) ─────────────────────────────
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
      // Strip inline comments (only outside quotes)
      if (!val.startsWith('"') && !val.startsWith("'")) {
        const hashIdx = val.indexOf(' #')
        if (hashIdx > 0) val = val.slice(0, hashIdx).trim()
      }
      // Strip surrounding quotes
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Dummy data ─────────────────────────────────────────────────
const PROPERTIES = [
  {
    id: 'a1000000-0000-0000-0000-000000000001',
    name: 'Moment Chalet A',
    description:
      '白馬村中心地帯に位置する温かみのある山小屋。北アルプスの雄大な景色を望み、スキー場まで徒歩圏内。木造の内装と暖炉が旅人を迎えます。',
    location: '長野県北安曇郡白馬村北城',
    lat: 36.7002,
    lng: 137.8601,
    has_breakfast_option: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000002',
    name: 'Moment Chalet B',
    description:
      '白馬八方尾根スキー場に隣接する絶好のロケーション。ゲレンデまで徒歩5分、スキーヤーに最適な宿。広々としたリビングと充実した設備が自慢です。',
    location: '長野県北安曇郡白馬村八方',
    lat: 36.6958,
    lng: 137.8712,
    has_breakfast_option: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000003',
    name: 'Moment Chalet C',
    description:
      '白馬岩岳スキー場近くの静かな山荘。家族連れやグループに人気の広い間取り。地元食材を使った朝食が評判で、アットホームな雰囲気が魅力です。',
    location: '長野県北安曇郡白馬村岩岳',
    lat: 36.7145,
    lng: 137.8523,
    has_breakfast_option: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000004',
    name: 'Moment Chalet D',
    description:
      '白馬村の自然に囲まれた隠れ家的な宿。夏はトレッキング、冬はスキーと四季を通じて楽しめます。露天風呂付きで疲れた体を癒してください。',
    location: '長野県北安曇郡白馬村飯森',
    lat: 36.7089,
    lng: 137.8445,
    has_breakfast_option: false,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000005',
    name: 'Moment Chalet E',
    description:
      '白馬五竜スキー場に近い便利な立地。モダンなインテリアと伝統的な日本の要素を融合させたデザイン。カップルや新婚旅行にも最適な特別な空間です。',
    location: '長野県北安曇郡白馬村神城',
    lat: 36.6812,
    lng: 137.8334,
    has_breakfast_option: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000006',
    name: 'Moment Chalet F',
    description:
      '白馬村の中心部に位置し、レストランやショップへのアクセスが抜群。スキーシーズンはもちろん、グリーンシーズンのハイキングベースとしても人気です。',
    location: '長野県北安曇郡白馬村白馬',
    lat: 36.7034,
    lng: 137.8678,
    has_breakfast_option: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000007',
    name: 'Moment Chalet G',
    description:
      '北アルプスの絶景を独り占めできる高台に建つ山荘。晴れた日には白馬三山が一望できます。大自然の中でゆったりとした時間をお過ごしください。',
    location: '長野県北安曇郡白馬村大出',
    lat: 36.7201,
    lng: 137.8389,
    has_breakfast_option: true,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000008',
    name: 'Moment Chalet H',
    description:
      '白馬村の伝統的な農家を改装したユニークな宿。古民家の趣を残しながら現代的な快適さを兼ね備えています。地元の文化と自然を体験できる特別な滞在を。',
    location: '長野県北安曇郡白馬村青鬼',
    lat: 36.7312,
    lng: 137.8256,
    has_breakfast_option: false,
  },
  {
    id: 'a1000000-0000-0000-0000-000000000009',
    name: 'Moment Chalet I',
    description:
      '白馬村の南端に位置する静かな隠れ家。姫川源流の清流が近く、夏は蛍が舞う幻想的な環境。少人数のグループや家族旅行に最適な贅沢な空間です。',
    location: '長野県北安曇郡白馬村嶺方',
    lat: 36.6723,
    lng: 137.8167,
    has_breakfast_option: true,
  },
].map((p, idx) => ({
  ...p,
  images: [
    `https://placehold.co/800x600/2c5f5d/ffffff?text=${encodeURIComponent(p.name)}+1`,
    `https://placehold.co/800x600/4a7c7b/ffffff?text=${encodeURIComponent(p.name)}+2`,
    `https://placehold.co/800x600/6ba3a1/ffffff?text=${encodeURIComponent(p.name)}+3`,
  ],
  ical_url: null,
  is_active: true,
}))

const ROOM_TYPE_TEMPLATES = [
  {
    name: 'スタンダードツイン',
    capacity: 2,
    price: 8000,
    amenities: ['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ'],
  },
  {
    name: 'デラックスダブル',
    capacity: 2,
    price: 12000,
    amenities: ['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'バスタブ', 'マウンテンビュー'],
  },
  {
    name: 'ファミリールーム',
    capacity: 5,
    price: 18000,
    amenities: ['WiFi', '駐車場', '暖房', 'タオル・アメニティ', 'テレビ', 'キッチン', '洗濯機'],
  },
]

const ROOM_TYPES = PROPERTIES.flatMap((p, propIdx) =>
  ROOM_TYPE_TEMPLATES.map((tpl, roomIdx) => ({
    // UUID format 8-4-4-4-12. Property 1, room 1 → b2000000-0000-0000-0000-000100000001
    id: `b2000000-0000-0000-0000-${String(propIdx + 1).padStart(4, '0')}0000${String(roomIdx + 1).padStart(4, '0')}`,
    property_id: p.id,
    name: tpl.name,
    capacity: tpl.capacity,
    price_per_night: tpl.price,
    breakfast_price: p.has_breakfast_option ? 800 : 0,
    amenities: tpl.amenities,
    images: [
      `https://placehold.co/800x600/4a7c7b/ffffff?text=${encodeURIComponent(p.name + ' ' + tpl.name)}`,
    ],
    is_active: true,
  })),
)

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}
function addDays(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const today = new Date()
const SAMPLE_BOOKINGS = [
  {
    room_type_id: ROOM_TYPES[0].id,
    guest_name: '田中 太郎',
    guest_email: 'taro.tanaka@example.com',
    guest_phone: '+81-90-1234-5678',
    check_in: isoDate(addDays(today, 10)),
    check_out: isoDate(addDays(today, 13)),
    include_breakfast: true,
    total_amount: (8000 + 800) * 3,
    status: 'confirmed',
    paypal_order_id: 'DEMO-ORDER-0001',
    paypal_capture_id: 'DEMO-CAPTURE-0001',
    special_requests: '高層階を希望します',
  },
  {
    room_type_id: ROOM_TYPES[4].id,
    guest_name: 'Emily Chen',
    guest_email: 'emily.chen@example.com',
    guest_phone: '+886-912-345-678',
    check_in: isoDate(addDays(today, 20)),
    check_out: isoDate(addDays(today, 24)),
    include_breakfast: false,
    total_amount: 12000 * 4,
    status: 'confirmed',
    paypal_order_id: 'DEMO-ORDER-0002',
    paypal_capture_id: 'DEMO-CAPTURE-0002',
    special_requests: null,
  },
  {
    room_type_id: ROOM_TYPES[7].id,
    guest_name: 'John Smith',
    guest_email: 'john.smith@example.com',
    guest_phone: '+1-555-0142',
    check_in: isoDate(addDays(today, -15)),
    check_out: isoDate(addDays(today, -10)),
    include_breakfast: true,
    total_amount: (18000 + 800) * 5,
    status: 'refunded',
    paypal_order_id: 'DEMO-ORDER-0003',
    paypal_capture_id: 'DEMO-CAPTURE-0003',
    special_requests: 'Allergic to peanuts',
  },
  {
    room_type_id: ROOM_TYPES[10].id,
    guest_name: '王 小明',
    guest_email: 'xiaoming.wang@example.com',
    guest_phone: '+886-933-111-222',
    check_in: isoDate(addDays(today, 5)),
    check_out: isoDate(addDays(today, 7)),
    include_breakfast: false,
    total_amount: 10000 * 2,
    status: 'pending',
    paypal_order_id: null,
    paypal_capture_id: null,
    special_requests: null,
  },
  {
    room_type_id: ROOM_TYPES[15].id,
    guest_name: '佐藤 花子',
    guest_email: 'hanako.sato@example.com',
    guest_phone: '+81-80-9876-5432',
    check_in: isoDate(addDays(today, 30)),
    check_out: isoDate(addDays(today, 33)),
    include_breakfast: true,
    total_amount: (13000 + 850) * 3,
    status: 'confirmed',
    paypal_order_id: 'DEMO-ORDER-0005',
    paypal_capture_id: 'DEMO-CAPTURE-0005',
    special_requests: null,
  },
]

const BLOCKED_DATES = [
  {
    property_id: PROPERTIES[0].id,
    start_date: isoDate(addDays(today, 40)),
    end_date: isoDate(addDays(today, 45)),
    source: 'ical',
  },
  {
    property_id: PROPERTIES[2].id,
    start_date: isoDate(addDays(today, 15)),
    end_date: isoDate(addDays(today, 18)),
    source: 'manual',
  },
  {
    property_id: PROPERTIES[5].id,
    start_date: isoDate(addDays(today, 50)),
    end_date: isoDate(addDays(today, 55)),
    source: 'ical',
  },
]

// ── Run ────────────────────────────────────────────────────────
async function step(label, promise) {
  process.stdout.write(`→ ${label} ... `)
  const { error, count } = await promise
  if (error) {
    console.log('FAIL')
    console.error(`   ${error.message}`)
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.error('   Hint: run the SQL migrations in supabase/migrations/ first (Supabase Dashboard → SQL Editor).')
    }
    process.exit(1)
  }
  console.log(count != null ? `ok (${count})` : 'ok')
}

async function main() {
  console.log(`Seeding ${SUPABASE_URL}\n`)

  // Wipe in dependency order
  await step('clearing bookings', supabase.from('bookings').delete().not('id', 'is', null))
  await step('clearing blocked_dates', supabase.from('blocked_dates').delete().not('id', 'is', null))
  await step('clearing room_types', supabase.from('room_types').delete().not('id', 'is', null))
  await step('clearing properties', supabase.from('properties').delete().not('id', 'is', null))

  // Insert in dependency order
  await step(`inserting properties (${PROPERTIES.length})`, supabase.from('properties').insert(PROPERTIES))
  await step(`inserting room_types (${ROOM_TYPES.length})`, supabase.from('room_types').insert(ROOM_TYPES))
  await step(`inserting bookings (${SAMPLE_BOOKINGS.length})`, supabase.from('bookings').insert(SAMPLE_BOOKINGS))
  await step(`inserting blocked_dates (${BLOCKED_DATES.length})`, supabase.from('blocked_dates').insert(BLOCKED_DATES))

  console.log('\n✓ Seed complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
