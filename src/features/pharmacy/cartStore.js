/**
 * Global pharmacy cart — one store for every pharmacy screen.
 *
 * - Supabase (`pharmacy_carts` / `pharmacy_cart_items`) stays the source of
 *   truth; this store mirrors it and applies taps optimistically, so steppers
 *   and the header badge update on the same frame as the tap.
 * - Rapid taps on one medicine coalesce into a single idempotent write
 *   (`setDrugQuantity` upserts the absolute quantity); writes for the same
 *   medicine are serialised so the last tap always wins.
 * - A failed write rolls back to the server copy and reports the error to the
 *   caller. Changes made elsewhere (checkout, reorder, another tab) arrive via
 *   the `pharmacy-cart-changed` event and trigger a reload.
 */
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { CART_EVENT, getCart, setDrugQuantity } from './shopApi'

const SOURCE = 'cart-store'
const WRITE_DELAY_MS = 280
export const CART_MAX_QTY = 20

let ownerId // undefined until the first sync, null when signed out
let status = 'idle' // idle | loading | ready | signed-out | error
let lines = new Map() // drugId → { drugId, quantity, product }
let lastError = null
let loadToken = 0
let reloadTimer = 0

const desired = new Map() // drugId → { quantity, product } not yet confirmed by the server
const queued = new Map() // drugId → { timer, waiters }
const writing = new Map() // drugId → Promise
const listeners = new Set()

function build() {
  let count = 0
  let subtotal = 0
  for (const line of lines.values()) {
    count += line.quantity
    subtotal += (line.product?.price ?? 0) * line.quantity
  }
  return { status, error: lastError, count, subtotal, lines: [...lines.values()], byDrug: lines }
}

let snapshot = build()

function emit() {
  snapshot = build()
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return snapshot
}

function withLine(map, drugId, quantity, product) {
  const next = new Map(map)
  if (quantity > 0) {
    next.set(drugId, { drugId, quantity, product: product || map.get(drugId)?.product || null })
  } else {
    next.delete(drugId)
  }
  return next
}

async function load() {
  if (!ownerId) return
  const token = ++loadToken
  if (status !== 'ready') {
    status = 'loading'
    emit()
  }
  try {
    const cart = await getCart()
    if (token !== loadToken) return
    let next = new Map(cart.items.map((item) => [
      item.drugId,
      { drugId: item.drugId, quantity: item.quantity, product: item.product },
    ]))
    // Taps the server has not confirmed yet win over the copy we just read.
    for (const [drugId, want] of desired) next = withLine(next, drugId, want.quantity, want.product)
    lines = next
    status = 'ready'
    lastError = null
    emit()
  } catch (err) {
    if (token !== loadToken) return
    status = err?.code === 'AUTH' ? 'signed-out' : 'error'
    lastError = err
    emit()
  }
}

function scheduleReload() {
  window.clearTimeout(reloadTimer)
  reloadTimer = window.setTimeout(load, 400)
}

function settle(drugId) {
  if (queued.has(drugId) || writing.has(drugId)) return
  desired.delete(drugId)
  scheduleReload()
}

function flush(drugId) {
  const entry = queued.get(drugId)
  queued.delete(drugId)
  if (!entry) return
  const prior = writing.get(drugId) || Promise.resolve()
  const run = prior.catch(() => {}).then(() => {
    const want = desired.get(drugId)
    if (!want) return undefined
    return setDrugQuantity(drugId, want.quantity, { source: SOURCE })
  })
  writing.set(drugId, run)
  run
    .then(() => {
      entry.waiters.forEach((resolve) => resolve({ ok: true }))
    })
    .catch((err) => {
      // Drop the optimistic value and fall back to what the server holds.
      desired.delete(drugId)
      lastError = err
      entry.waiters.forEach((resolve) => resolve({ ok: false, error: err }))
      load()
    })
    .finally(() => {
      if (writing.get(drugId) === run) writing.delete(drugId)
      settle(drugId)
    })
}

/**
 * Set the absolute quantity of a product. The UI updates immediately; the
 * returned promise resolves with `{ ok, error }` once Supabase confirms.
 */
export function setCartQuantity(product, quantity) {
  if (!product?.id) return Promise.resolve({ ok: false, error: new Error('Unknown product.') })
  if (!ownerId) {
    const err = new Error('Sign in to add medicines to your cart.')
    err.code = 'AUTH'
    return Promise.resolve({ ok: false, error: err })
  }
  const drugId = product.id
  const qty = Math.min(CART_MAX_QTY, Math.max(0, Math.floor(Number(quantity) || 0)))
  desired.set(drugId, { quantity: qty, product })
  lines = withLine(lines, drugId, qty, product)
  lastError = null
  emit()
  const entry = queued.get(drugId) || { timer: 0, waiters: [] }
  window.clearTimeout(entry.timer)
  return new Promise((resolve) => {
    entry.waiters.push(resolve)
    entry.timer = window.setTimeout(() => flush(drugId), WRITE_DELAY_MS)
    queued.set(drugId, entry)
  })
}

/** Resolves once every pending tap has been written (checkout waits on this). */
export async function flushCart() {
  for (const drugId of [...queued.keys()]) {
    window.clearTimeout(queued.get(drugId).timer)
    flush(drugId)
  }
  await Promise.allSettled([...writing.values()])
}

export function refreshCart() {
  return load()
}

function syncOwner(id) {
  if (id === ownerId) return
  ownerId = id
  loadToken += 1
  for (const entry of queued.values()) window.clearTimeout(entry.timer)
  queued.clear()
  desired.clear()
  lines = new Map()
  lastError = null
  status = id ? 'idle' : 'signed-out'
  emit()
  if (id) load()
}

if (typeof window !== 'undefined') {
  window.addEventListener(CART_EVENT, (event) => {
    if (event?.detail?.source === SOURCE) return
    if (ownerId) load()
  })
}

/** The whole cart: `{ status, error, count, subtotal, lines, byDrug }`. */
export function useCart() {
  const { user } = useAuth()
  const uid = user?.id ?? null
  useEffect(() => { syncOwner(uid) }, [uid])
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useCartCount() {
  return useCart().count
}

/** Quantity of one product plus a setter — what every stepper binds to. */
export function useCartItem(product) {
  const cart = useCart()
  const quantity = product?.id ? cart.byDrug.get(product.id)?.quantity ?? 0 : 0
  const setQuantity = useCallback((next) => setCartQuantity(product, next), [product])
  return [quantity, setQuantity]
}
