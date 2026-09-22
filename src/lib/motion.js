/**
 * Shared motion language — pages navigate, sheets layer, dialogs fade.
 * Durations stay in the 220–280ms range; easing is calm ease-out (no bounce).
 */

export const MOTION = Object.freeze({
  SHEET_MS: 260,
  PAGE_MS: 280,
  DIALOG_MS: 220,
  EASE: 'cubic-bezier(0.32, 0.72, 0, 1)',
  SHEET_SCALE: 0.98,
  SHEET_SHIFT_PX: 6,
  PAGE_UNDERLAY_SCALE: 0.98,
  PAGE_UNDERLAY_BRIGHTNESS: 0.86,
})
