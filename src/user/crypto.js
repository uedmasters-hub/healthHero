function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function createSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

export async function hashSecret(value, salt) {
  const encoded = new TextEncoder().encode(`${salt}:${value}`)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return toHex(digest)
}

export async function secretsMatch(value, salt, expectedHash) {
  if (!value || !salt || !expectedHash) return false
  const next = await hashSecret(value, salt)
  return next === expectedHash
}
