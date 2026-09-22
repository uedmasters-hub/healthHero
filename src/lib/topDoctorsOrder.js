import { useSyncExternalStore, useEffect, useState } from 'react'
import { getDoctorList, subscribeProviders, hydrateProviders } from '../features/providers'

export const HOME_TOP_COUNT = 4
export const SHEET_TOP_COUNT = 10

function listIds(count = SHEET_TOP_COUNT) {
  return getDoctorList().slice(0, count).map((doc) => doc.id)
}

let ids = listIds()
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return ids
}

function doctorsFor(order, count) {
  const catalog = getDoctorList()
  const byId = new Map(catalog.map((doc) => [String(doc.id), doc]))
  const ordered = order
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
  if (ordered.length >= count) return ordered.slice(0, count)
  // Fill from live featured catalog when order is stale/empty.
  const seen = new Set(ordered.map((d) => String(d.id)))
  for (const doc of catalog) {
    if (seen.has(String(doc.id))) continue
    ordered.push(doc)
    if (ordered.length >= count) break
  }
  return ordered.slice(0, count)
}

function syncIdsFromCatalog() {
  const next = listIds()
  if (!next.length) return
  const same = next.length === ids.length && next.every((id, i) => String(id) === String(ids[i]))
  if (same) return
  // Keep promoted head if still present.
  const head = ids[0]
  if (head != null && next.some((id) => String(id) === String(head))) {
    ids = [head, ...next.filter((id) => String(id) !== String(head))].slice(0, SHEET_TOP_COUNT)
  } else {
    ids = next
  }
  emit()
}

// Keep Home recommendations aligned with live registry hydrations.
subscribeProviders(syncIdsFromCatalog)
hydrateProviders().then(syncIdsFromCatalog).catch(() => {})

export function promoteTopDoctor(id) {
  if (id == null) return ids
  const key = String(id)
  if (String(ids[0]) === key) return ids
  const rest = ids.filter((item) => String(item) !== key)
  ids = [id, ...rest].slice(0, SHEET_TOP_COUNT)
  emit()
  return ids
}

export function getTopDoctorIds() {
  return ids
}

export function useTopDoctors(count = SHEET_TOP_COUNT) {
  const order = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const [, bump] = useState(0)
  useEffect(() => subscribeProviders(() => bump((n) => n + 1)), [])
  return doctorsFor(order, count)
}
