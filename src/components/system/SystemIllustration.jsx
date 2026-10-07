/**
 * Spot illustrations for system states — a tinted disc, a soft orbit ring and
 * one stroked glyph, all driven by tone tokens. Swap for artwork per state by
 * passing `image` to SystemState.
 */

const GLYPHS = {
  compass: (
    <>
      <circle cx="24" cy="24" r="15" />
      <path d="m29.5 18.5-3.6 8.4-8.4 3.6 3.6-8.4z" />
      <circle cx="24" cy="24" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  lock: (
    <>
      <rect x="13" y="21" width="22" height="16" rx="3.5" />
      <path d="M17.5 21v-4.5a6.5 6.5 0 0 1 13 0V21" />
      <path d="M24 27.5v3.5" />
    </>
  ),
  shield: (
    <>
      <path d="M24 9.5 36 14v9c0 7.6-5.1 13.2-12 15.5C17.1 36.2 12 30.6 12 23v-9z" />
      <path d="m19 19 10 10M29 19 19 29" />
    </>
  ),
  hourglass: (
    <>
      <path d="M16 10h16M16 38h16" />
      <path d="M18 10v4.5a6 6 0 0 0 2.6 4.9L24 22l3.4-2.6a6 6 0 0 0 2.6-4.9V10" />
      <path d="M18 38v-4.5a6 6 0 0 1 2.6-4.9L24 26l3.4 2.6a6 6 0 0 1 2.6 4.9V38" />
    </>
  ),
  gauge: (
    <>
      <path d="M10.5 31a14 14 0 1 1 27 0" />
      <path d="m24 29 7-9" />
      <circle cx="24" cy="29.5" r="2" />
      <path d="M14.5 21.5l1.8 1M33.5 21.5l-1.8 1M24 15v2" />
    </>
  ),
  server: (
    <>
      <rect x="11" y="11" width="26" height="11" rx="2.5" />
      <rect x="11" y="26" width="26" height="11" rx="2.5" />
      <path d="M16 16.5h.01M16 31.5h.01M21 16.5h10M21 31.5h10" />
    </>
  ),
  'wifi-off': (
    <>
      <path d="M9 19.5a21 21 0 0 1 10-4.8M28.5 14.8A21 21 0 0 1 39 19.5" />
      <path d="M14.5 25a13 13 0 0 1 6-3M27.6 22.1a13 13 0 0 1 5.9 2.9" />
      <path d="M20 30.5a6 6 0 0 1 8 0" />
      <circle cx="24" cy="35.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="m11 11 26 26" />
    </>
  ),
  signal: (
    <>
      <path d="M13 36v-5M20 36v-10" />
      <path d="M27 36V20M34 36V14" opacity="0.3" />
    </>
  ),
  tools: (
    <>
      <path d="M28.5 12.5a7 7 0 0 0-8.8 8.9L11 30.1a3.2 3.2 0 1 0 4.5 4.5l8.7-8.7a7 7 0 0 0 8.9-8.8l-4.3 4.3-3.8-1-1-3.8z" />
      <path d="m30 30 6 6" />
    </>
  ),
  alert: (
    <>
      <path d="M21.4 11.5a3 3 0 0 1 5.2 0l11 19.5a3 3 0 0 1-2.6 4.5H13a3 3 0 0 1-2.6-4.5z" />
      <path d="M24 20v6.5" />
      <circle cx="24" cy="30.8" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  inbox: (
    <>
      <path d="M11 26 15.5 13h17L37 26v8a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z" />
      <path d="M11 26h8l2 3.5h6l2-3.5h8" />
    </>
  ),
  clock: (
    <>
      <circle cx="24" cy="25" r="13" />
      <path d="M24 18v7l4.5 3" />
      <path d="M20 9.5h8" />
    </>
  ),
  key: (
    <>
      <circle cx="18" cy="28" r="7" />
      <path d="m23 23 13-13M31 15l3.5 3.5M27.5 18.5l2.5 2.5" />
    </>
  ),
  document: (
    <>
      <path d="M15 9.5h12l7 7V36a2.5 2.5 0 0 1-2.5 2.5h-16A2.5 2.5 0 0 1 13 36V12a2.5 2.5 0 0 1 2-2.5z" />
      <path d="M27 9.5V17h7" />
      <path d="m20 24 8 8M28 24l-8 8" />
    </>
  ),
  spinner: (
    <path className="sys-art__spin" d="M24 10a14 14 0 1 1-14 14" />
  ),
}

export default function SystemIllustration({ art = 'alert', tone = 'brand', size = 'lg' }) {
  return (
    <span className={`sys-art is-${tone} is-${size}`} aria-hidden="true">
      <svg viewBox="0 0 96 96" className="sys-art__svg">
        <circle className="sys-art__disc" cx="48" cy="48" r="40" />
        <circle className="sys-art__orbit" cx="48" cy="48" r="46" />
        <circle className="sys-art__dot" cx="14" cy="22" r="2.5" />
        <circle className="sys-art__dot" cx="84" cy="70" r="2" />
        <g
          transform="translate(24 24)"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {GLYPHS[art] || GLYPHS.alert}
        </g>
      </svg>
    </span>
  )
}
