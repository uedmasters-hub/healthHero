/**
 * Cross-bar voice activation intent.
 * Home mic can queue a start before /search activates; any SearchBar
 * that becomes interactive consumes it via VoiceSearchService.start().
 */

let pendingVoiceStart = false

export function queueVoiceStart() {
  pendingVoiceStart = true
}

export function takeVoiceStart() {
  if (!pendingVoiceStart) return false
  pendingVoiceStart = false
  return true
}

export function peekVoiceStart() {
  return pendingVoiceStart
}

export function clearVoiceStart() {
  pendingVoiceStart = false
}
