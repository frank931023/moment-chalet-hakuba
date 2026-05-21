#!/usr/bin/env node
/**
 * Create an admin user in Supabase Auth so you can log into /admin.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> <password>
 *
 * Example:
 *   node scripts/create-admin.mjs admin@chalet.com SuperSecret123
 *
 * If a user with this email already exists, the password is updated instead.
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

const [, , email, password] = process.argv
if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password>')
  process.exit(1)
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('❌ Invalid email format')
  process.exit(1)
}
if (password.length < 6) {
  console.error('❌ Password must be at least 6 characters')
  process.exit(1)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Check if user exists
const { data: existing, error: listErr } = await supabase.auth.admin.listUsers()
if (listErr) {
  console.error(`❌ ${listErr.message}`)
  process.exit(1)
}

const existingUser = existing.users.find((u) => u.email === email)

if (existingUser) {
  process.stdout.write(`→ User ${email} already exists; resetting password... `)
  const { error } = await supabase.auth.admin.updateUserById(existingUser.id, { password })
  if (error) {
    console.log('FAIL')
    console.error(`   ${error.message}`)
    process.exit(1)
  }
  console.log('ok')
} else {
  process.stdout.write(`→ Creating admin user ${email}... `)
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip the email verification step
  })
  if (error) {
    console.log('FAIL')
    console.error(`   ${error.message}`)
    process.exit(1)
  }
  console.log('ok')
}

console.log(`\n✓ Done. Log in at http://localhost:5173/admin/login`)
console.log(`  Email:    ${email}`)
console.log(`  Password: ${password}`)
