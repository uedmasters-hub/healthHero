/**
 * Installation identity for guest activity.
 * A random id generated once per app install and kept in localStorage.
 * It is not derived from hardware (no MAC address) and is only a correlation key.
 */

const INSTALL_KEY = 'emedicalls.installId'
const CLAIM_KEY = 'emedicalls.installClaim'

function randomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function read(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode — id lives for this document only via memory fallback */
  }
}

let memoryInstall = ''
let memoryClaim = ''

export function getInstallId() {
  const stored = read(INSTALL_KEY)
  if (stored) return stored
  if (!memoryInstall) memoryInstall = randomId()
  write(INSTALL_KEY, memoryInstall)
  return memoryInstall
}

/** Secret that proves this install may claim its guest events. Never sent except to the migrate RPC. */
export function getInstallClaim() {
  const stored = read(CLAIM_KEY)
  if (stored && stored.length >= 32) return stored
  if (!memoryClaim) {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    memoryClaim = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  write(CLAIM_KEY, memoryClaim)
  return memoryClaim
}
