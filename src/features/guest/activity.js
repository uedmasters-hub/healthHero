/**
 * Guest activity: local queue + idempotent Supabase upsert, then a
 * retry-safe migration onto the patient record after identification.
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { getInstallClaim, getInstallId } from './installId'

const QUEUE_KEY = 'emedicalls.guest.events'
const MIGRATION_KEY = 'emedicalls.guest.migration'
const CART_SNAPSHOT_KEY = 'emedicalls.guest.cartSnapshot'

let flushing = false
let captureGuest = true

/** Identified sessions stop appending. Guests keep the queue for later migration. */
export function setGuestCapture(enabled) {
  captureGuest = Boolean(enabled)
}

export function listGuestEvents() {
  return readQueue()
}

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeQueue(list) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list))
  } catch {
    /* private mode */
  }
}

async function digest(text) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * @param {object} input
 * @param {string} input.eventType
 * @param {string} [input.entityType]
 * @param {string} [input.entityId]
 * @param {object} [input.metadata]
 * @param {string} [input.dedupeKey] stable key so a retry of the same action is one row
 */
export async function recordGuestEvent({
  eventType,
  entityType = null,
  entityId = null,
  metadata = {},
  dedupeKey = null,
  occurredAt = new Date().toISOString(),
} = {}) {
  if (!captureGuest || !eventType) return null
  const installId = getInstallId()
  const keySource = dedupeKey || crypto.randomUUID()
  const idempotencyKey = await digest([
    installId,
    eventType,
    entityType || '',
    entityId || '',
    keySource,
  ].join('|'))

  const event = {
    idempotencyKey,
    installId,
    eventType,
    entityType,
    entityId: entityId == null ? null : String(entityId),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    occurredAt,
    synced: false,
    migrated: false,
  }

  const queue = readQueue().filter((row) => row.idempotencyKey !== idempotencyKey)
  queue.push(event)
  writeQueue(queue.slice(-400))
  flushGuestEvents()
  return event
}

export function flushGuestEvents() {
  if (flushing || !isSupabaseConfigured) return Promise.resolve()
  flushing = true
  return pushQueue().then((result) => {
    flushing = false
    if (result !== 'stop' && readQueue().some((row) => !row.synced)) {
      window.setTimeout(() => flushGuestEvents(), 4000)
    }
  }).catch(() => {
    flushing = false
  })
}

async function pushQueue() {
  const pending = readQueue().filter((row) => !row.synced)
  if (!pending.length) return
  const supabase = requireSupabase()
  const claim = getInstallClaim()
  const synced = new Set()

  let missing = false
  for (const row of pending) {
    const { error } = await supabase.rpc('record_guest_event', {
      p_idempotency_key: row.idempotencyKey,
      p_install_id: row.installId,
      p_claim_token: claim,
      p_event_type: row.eventType,
      p_entity_type: row.entityType,
      p_entity_id: row.entityId,
      p_metadata: row.metadata || {},
      p_occurred_at: row.occurredAt,
    })
    if (!error) synced.add(row.idempotencyKey)
    else if (error.code === 'PGRST202' || /record_guest_event/i.test(error.message || '')) missing = true
  }

  if (missing) return 'stop'
  if (!synced.size) return 'retry'
  writeQueue(readQueue().map((row) => (
    synced.has(row.idempotencyKey) ? { ...row, synced: true } : row
  )))
  return 'ok'
}

function readMigration() {
  try {
    const raw = localStorage.getItem(MIGRATION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeMigration(value) {
  try {
    if (!value) localStorage.removeItem(MIGRATION_KEY)
    else localStorage.setItem(MIGRATION_KEY, JSON.stringify(value))
  } catch {
    /* private mode */
  }
}

/**
 * Link every unmigrated event for this install to the signed-in patient.
 * Safe to call again after a dropped connection: already-migrated rows stay put.
 */
export async function migrateGuestActivity() {
  const queue = readQueue()
  const outstanding = queue.some((row) => !row.migrated)
  const inflight = readMigration()
  if (!outstanding && !inflight) return { ok: true, migrated: 0 }
  if (!isSupabaseConfigured) return { ok: false, pending: true }

  await flushGuestEvents()
  writeMigration({ startedAt: inflight?.startedAt || new Date().toISOString() })

  const supabase = requireSupabase()
  const { data, error } = await supabase.rpc('migrate_guest_activity', {
    p_install_id: getInstallId(),
    p_claim_token: getInstallClaim(),
  })
  if (error) return { ok: false, error: error.message }

  const now = new Date().toISOString()
  // Only rows that reached Supabase are marked migrated. Unsynced rows stay
  // queued so an interrupted upload can be retried without a duplicate insert.
  writeQueue(readQueue().map((row) => (
    row.synced ? { ...row, migrated: true, migratedAt: row.migratedAt || now } : row
  )))
  if (!readQueue().some((row) => !row.migrated)) writeMigration(null)
  return { ok: true, migrated: Number(data) || 0 }
}

export function saveGuestCartSnapshot(lines, anonymousUserId) {
  try {
    sessionStorage.setItem(CART_SNAPSHOT_KEY, JSON.stringify({
      anonymousUserId: anonymousUserId || null,
      lines: (lines || []).map((line) => ({
        drugId: line.drugId || line.drug_id,
        quantity: line.quantity || 1,
      })).filter((line) => line.drugId),
    }))
  } catch {
    /* ignore */
  }
}

export function readGuestCartSnapshot() {
  try {
    const raw = sessionStorage.getItem(CART_SNAPSHOT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearGuestCartSnapshot() {
  try {
    sessionStorage.removeItem(CART_SNAPSHOT_KEY)
  } catch {
    /* ignore */
  }
}
