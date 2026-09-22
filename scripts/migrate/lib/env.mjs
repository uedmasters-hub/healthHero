#!/usr/bin/env node
/**
 * Load env for migration scripts (never ships service role to the client).
 * Precedence: process.env → .env.local → .env → .env.migration
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../../..')

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const out = {}
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

export function loadMigrationEnv() {
  const files = ['.env.migration', '.env.local', '.env']
  const merged = {}
  for (const name of files) {
    Object.assign(merged, parseEnvFile(path.join(ROOT, name)))
  }
  for (const [k, v] of Object.entries(merged)) {
    if (process.env[k] == null || process.env[k] === '') process.env[k] = v
  }

  const url = process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || process.env.EXPO_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SECRET_KEY

  return {
    root: ROOT,
    url,
    serviceKey,
    orgId: process.env.EMEDICALLS_ORG_ID || '00000000-0000-4000-a000-000000000000',
    batchSize: Math.max(50, Number(process.env.MIGRATE_BATCH_SIZE) || 250),
  }
}

export function requireServiceClient() {
  const env = loadMigrationEnv()
  if (!env.url || !env.serviceKey) {
    throw new Error(
      'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.\n'
      + 'Add them to .env.migration (gitignored) or export them in your shell.\n'
      + 'Never put the service role key in VITE_* client env vars.',
    )
  }
  return env
}
