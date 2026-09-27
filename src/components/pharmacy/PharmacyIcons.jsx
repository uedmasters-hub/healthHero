/** Shared pharmacy icon set — stroke language matches eMedicalls services. */

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
  if (name === 'building') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 21v-4h6v4M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
      </svg>
    )
  }
  if (name === 'plus') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    )
  }
  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    )
  }
  if (name === 'calendar') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    )
  }
  if (name === 'ambulance') {
    return (
      <svg {...common}>
        <path d="M3 16V7h11l4 5v4" />
        <path d="M3 16h15" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="16" cy="17" r="2" />
        <path d="M7 10h4M9 8v4" />
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
  if (name === 'bottle') {
    return (
      <svg {...common}>
        <path d="M10 3h4v2l1 2v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V7l1-2V3z" />
        <path d="M9 11h6" />
      </svg>
    )
  }
  if (name === 'baby') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M7 20v-1a5 5 0 0 1 10 0v1" />
      </svg>
    )
  }
  if (name === 'cross') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    )
  }
  if (name === 'device') {
    return (
      <svg {...common}>
        <rect x="7" y="3" width="10" height="18" rx="3" />
        <path d="M11 18h2" />
      </svg>
    )
  }
  if (name === 'leaf') {
    return (
      <svg {...common}>
        <path d="M5 19c8 0 14-8 14-14-6 0-14 6-14 14z" />
        <path d="M8 16c2-3 5-6 9-8" />
      </svg>
    )
  }
  if (name === 'tag') {
    return (
      <svg {...common}>
        <path d="M20 13l-7 7-9-9V4h7l9 9z" />
        <circle cx="7.5" cy="7.5" r="1" />
      </svg>
    )
  }
  if (name === 'shield') {
    return (
      <svg {...common}>
        <path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-3z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  }
  if (name === 'truck') {
    return (
      <svg {...common}>
        <path d="M3 7h11v8H3zM14 10h4l3 3v2h-7" />
        <circle cx="7" cy="17" r="1.5" />
        <circle cx="17" cy="17" r="1.5" />
      </svg>
    )
  }
  if (name === 'return') {
    return (
      <svg {...common}>
        <path d="M4 12a8 8 0 1 0 2.3-5.6" />
        <polyline points="4 4 4 9 9 9" />
      </svg>
    )
  }
  if (name === 'lock') {
    return (
      <svg {...common}>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    )
  }
  if (name === 'panel') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
      </svg>
    )
  }
  return null
}
