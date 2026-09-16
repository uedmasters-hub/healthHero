import { useSyncExternalStore } from 'react'
import { getDoctorList } from '../data/doctors'

export const HOME_TOP_COUNT = 4
export const SHEET_TOP_COUNT = 10

function defaultIds() {
  return getDoctorList().slice(0, SHEET_TOP_COUNT).map((doc) => doc.id)
}

let ids = defaultIds()
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
  const byId = new Map(getDoctorList().map((doc) => [doc.id, doc]))
  return order.slice(0, count).map((id) => byId.get(id)).filter(Boolean)
}

export function promoteTopDoctor(id) {
  const num = Number(id)
  if (!Number.isFinite(num) || ids[0] === num) return ids
  const rest = ids.filter((item) => item !== num)
  ids = rest.length === ids.length
    ? [num, ...ids].slice(0, SHEET_TOP_COUNT)
    : [num, ...rest]
  emit()
  return ids
}

export function getTopDoctorIds() {
  return ids
}

export function useTopDoctors(count = SHEET_TOP_COUNT) {
  const order = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return doctorsFor(order, count)
}
