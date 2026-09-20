/** Shared pharmacy icon set — stroke language matches Health Hero services. */

export function PharmacyIcon({ name, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  if (name === 'refill') {
    return (
      <svg {...common}>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <polyline points="21 3 21 9 15 9" />
        <path d="M9 8h2v8H9zM13 10h2v6h-2z" />
      </svg>
    )
  }
  if (name === 'rx') {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 15h6M9 11h3" />
      </svg>
    )
  }
  if (name === 'bag') {
    return (
      <svg {...common}>
        <path d="M6 7h12l1 13H5L6 7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    )
  }
  if (name === 'chat') {
    return (
      <svg {...common}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    )
  }
  if (name === 'chevron') {
    return (
      <svg {...common} width={16} height={16}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    )
  }
  if (name === 'pill') {
    return (
      <svg {...common}>
        <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
        <path d="M9 12h6" />
      </svg>
    )
  }
  if (name === 'spark') {
    return (
      <svg {...common}>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return null
}
