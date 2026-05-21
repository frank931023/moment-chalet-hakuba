#!/usr/bin/env node
/**
 * Trigger the deployed email-send Edge Function with a test payload.
 *
 * Usage:
 *   node scripts/test-email.mjs <recipient_email> [template]
 *
 *   template = booking_confirmed (default) | booking_refunded
 *
 * Example:
 *   node scripts/test-email.mjs you@example.com
 *   node scripts/test-email.mjs you@example.com booking_refunded
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

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

const [, , recipient, templateArg] = process.argv
const template = templateArg ?? 'booking_confirmed'

if (!recipient) {
  console.error('Usage: node scripts/test-email.mjs <recipient_email> [template]')
  console.error('  template = booking_confirmed (default) | booking_refunded')
  process.exit(1)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const endpoint = `${SUPABASE_URL}/functions/v1/email-send`
console.log(`→ POST ${endpoint}`)
console.log(`  to:       ${recipient}`)
console.log(`  template: ${template}`)

const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: ANON_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: recipient,
    template,
    data: {
      guest_name: 'Frank',
      booking_id: 'TEST-' + Date.now().toString().slice(-6),
    },
  }),
})

const text = await res.text()
let body
try { body = JSON.parse(text) } catch { body = text }

console.log(`\nHTTP ${res.status}`)
console.log(body)

if (res.status === 200) {
  console.log('\n✓ Email dispatched. Check your inbox + Resend Dashboard → Logs.')
} else if (res.status === 404) {
  console.log('\n⚠ 404 — function not deployed. Run:  node scripts/deploy-functions.mjs email-send')
} else if (res.status === 500) {
  console.log('\n⚠ 500 — likely missing RESEND_API_KEY or EMAIL_FROM as Supabase secret.')
  console.log('  Run:  node scripts/deploy-functions.mjs --skip-deploy')
}
