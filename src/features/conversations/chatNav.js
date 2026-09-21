/**
 * Resolve chat back target from route state.
 * Contextual launches (Ready for Visit, pharmacy, …) return to their source;
 * inbox launches return to Message Center.
 */
export function resolveChatReturnTo(location, fallback = '/chat') {
  const state = location?.state || {}
  const candidate = state.returnTo
  if (typeof candidate === 'string' && candidate && candidate !== location?.pathname) {
    return candidate
  }
  if (state.from === 'inbox') return '/chat'
  return fallback
}
