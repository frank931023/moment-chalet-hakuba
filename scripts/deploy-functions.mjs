#!/usr/bin/env node
/**
 * One-shot deploy of every Supabase Edge Function + push all secrets from .env.
 *
 * Steps:
 *   1. Read .env, extract project ref from VITE_SUPABASE_URL
 *   2. Verify Supabase CLI is installed
 *   3. Link the project (idempotent)
 *   4. Push every key=value in .env as a Supabase secret (--env-file)
 *      — except VITE_* (frontend-only) and the noisy SUPABASE_* CLI-reserved ones
 *   5. Deploy each function under supabase/functions/
 *
 * Usage:
 *   node scripts/deploy-functions.mjs                 # deploy everything
 *   node scripts/deploy-functions.mjs chat email-send # deploy specific functions
 *   node scripts/deploy-functions.mjs --skip-secrets  # functions only, no secret push
 *   node scripts/deploy-functions.mjs --skip-deploy   # secrets only
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ENV_PATH = join(ROOT, '.env')
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions')

// ── Args ───────────────────────────────────────────────────────
const args = process.argv.slice(2)
const SKIP_SECRETS = args.includes('--skip-secrets')
const SKIP_DEPLOY = args.includes('--skip-deploy')
const FN_FILTER = args.filter((a) => !a.startsWith('--'))

// ── Read & parse .env ──────────────────────────────────────────
if (!existsSync(ENV_PATH)) {
  console.error('❌ .env not found at project root')
  process.exit(1)
}
const envText = readFileSync(ENV_PATH, 'utf8')
const envEntries = []
for (const raw of envText.split(/\r?\n/)) {
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
  envEntries.push({ key, val })
  // Expose to subprocesses (e.g. SUPABASE_ACCESS_TOKEN for the CLI)
  if (!(key in process.env)) process.env[key] = val
}

// Project ref derives from VITE_SUPABASE_URL: https://<ref>.supabase.co
const supabaseUrl = envEntries.find((e) => e.key === 'VITE_SUPABASE_URL')?.val ?? ''
const refMatch = supabaseUrl.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i)
if (!refMatch) {
  console.error(`❌ Cannot parse project ref from VITE_SUPABASE_URL="${supabaseUrl}"`)
  console.error('   Expected format: https://<ref>.supabase.co')
  process.exit(1)
}
const PROJECT_REF = refMatch[1]

// ── Helpers ────────────────────────────────────────────────────
function run(cmd, args, opts = {}) {
  const label = `${cmd} ${args.join(' ')}`
  console.log(`\n$ ${label}`)
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts })
  if (res.status !== 0) {
    console.error(`✗ command failed (exit ${res.status})`)
    process.exit(res.status ?? 1)
  }
}

function listFunctions() {
  return readdirSync(FUNCTIONS_DIR).filter((name) => {
    const full = join(FUNCTIONS_DIR, name)
    return statSync(full).isDirectory() && existsSync(join(full, 'index.ts'))
  })
}

// ── 1. Check Supabase CLI ──────────────────────────────────────
const versionRes = spawnSync('npx', ['supabase', '--version'], { encoding: 'utf8', shell: true })
if (versionRes.status !== 0) {
  console.error('❌ Supabase CLI not available via npx. Install with:  npm i -D supabase')
  process.exit(1)
}
console.log(`Supabase CLI: ${versionRes.stdout.trim()}`)
console.log(`Project ref: ${PROJECT_REF}`)

// ── 2. Link project ────────────────────────────────────────────
run('npx', ['supabase', 'link', '--project-ref', PROJECT_REF])

// ── 3. Push secrets ────────────────────────────────────────────
// Supabase CLI won't accept secret names starting with VITE_, SUPABASE_, or NEXT_PUBLIC_.
// Also strip values that still look like the example placeholders.
const EXCLUDE_PREFIXES = ['VITE_', 'SUPABASE_', 'NEXT_PUBLIC_', 'NODE_']
const placeholderHints = ['your_', 'placeholder', 'xxx', 'changeme']

if (!SKIP_SECRETS) {
  const secrets = envEntries.filter(({ key, val }) => {
    if (EXCLUDE_PREFIXES.some((p) => key.startsWith(p))) return false
    if (!val) return false
    const lower = val.toLowerCase()
    if (placeholderHints.some((h) => lower.includes(h))) return false
    return true
  })

  if (secrets.length === 0) {
    console.log('\n(no eligible secrets to push)')
  } else {
    // Write a temp file Supabase CLI can consume
    const tmpPath = join(ROOT, '.env.secrets.tmp')
    writeFileSync(tmpPath, secrets.map(({ key, val }) => `${key}=${val}`).join('\n') + '\n')
    console.log(`\nPushing ${secrets.length} secret(s):`)
    for (const { key } of secrets) console.log(`  - ${key}`)
    try {
      run('npx', ['supabase', 'secrets', 'set', '--env-file', tmpPath])
    } finally {
      try { unlinkSync(tmpPath) } catch {}
    }
  }
} else {
  console.log('\n(--skip-secrets: skipping secret push)')
}

// ── 4. Deploy functions ────────────────────────────────────────
if (!SKIP_DEPLOY) {
  const all = listFunctions()
  const targets = FN_FILTER.length > 0 ? FN_FILTER.filter((f) => all.includes(f)) : all
  const skipped = FN_FILTER.filter((f) => !all.includes(f))

  if (skipped.length > 0) {
    console.warn(`\n⚠ Unknown function(s) — skipped: ${skipped.join(', ')}`)
    console.warn(`  Available: ${all.join(', ')}`)
  }

  if (targets.length === 0) {
    console.log('\n(no functions to deploy)')
  } else {
    console.log(`\nDeploying ${targets.length} function(s): ${targets.join(', ')}`)
    for (const fn of targets) {
      run('npx', ['supabase', 'functions', 'deploy', fn])
    }
  }
} else {
  console.log('\n(--skip-deploy: skipping function deploy)')
}

console.log('\n✓ done.')
