export function toE164(countryCode, localNumber) {
  const cc = (countryCode || '').replace('+', '')
  const num = (localNumber || '').replace(/\D/g, '')
  return cc && num ? `+${cc}${num}` : num ? `+${num}` : ''
}
