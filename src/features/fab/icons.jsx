/** Named icons for FAB hub pills and utility modes — stroke 2, 24 viewBox. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function FabIcon({ name, className }) {
  const common = { className, viewBox: '0 0 24 24', ...stroke, 'aria-hidden': true }
  switch (name) {
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9.5 12h5M12 9.5v5" />
        </svg>
      )
    case 'chat':
      return (
        <svg {...common}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      )
    case 'stethoscope':
      return (
        <svg {...common}>
          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
          <circle cx="20" cy="10" r="2" />
        </svg>
      )
    case 'share':
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51 15.42 17.49M15.41 6.51 8.59 10.49" />
        </svg>
      )
    case 'pill':
      return (
        <svg {...common}>
          <path d="M10.5 3.5 3.5 10.5a5 5 0 0 0 7 7L17.5 10.5a5 5 0 0 0-7-7z" />
          <path d="M8.5 8.5l7 7" />
        </svg>
      )
    case 'cart':
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1" />
          <circle cx="17" cy="20" r="1" />
          <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H7" />
        </svg>
      )
    case 'flask':
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6.5L5.5 18a3 3 0 0 0 2.6 4.5h8a3 3 0 0 0 2.6-4.5L14 9.5V3" />
        </svg>
      )
    case 'nav':
      return (
        <svg {...common}>
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      )
    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 16V5" />
          <path d="M8 9l4-4 4 4" />
          <path d="M4 19h16" />
        </svg>
      )
    case 'help':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4" />
          <path d="M12 17h.01" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )
  }
}
