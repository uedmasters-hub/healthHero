import { createContext, useContext, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const FetchSessionContext = createContext(null)

/**
 * Scope for reveal/skeleton caches.
 * Home and specialty explore share a scope so returning from /explore/*
 * does not wipe Categories / TopDoctors / Footer reveal marks (which caused
 * Home to softly re-animate after Back).
 */
function sessionScope(pathname) {
  if (
    pathname === '/'
    || pathname === '/search'
    || pathname.startsWith('/explore')
  ) {
    return 'home'
  }
  if (pathname.startsWith('/booking')) return 'booking'
  // Keep appointment-journey cache across prepare → details → ready.
  if (
    pathname.startsWith('/prepare-visit')
    || pathname.startsWith('/appointment')
    || pathname.startsWith('/pre-checkin')
    || pathname.startsWith('/treat')
  ) {
    return 'appointment-journey'
  }
  const doctor = pathname.match(/^\/doctor\/([^/]+)/)
  if (doctor) return `doctor:${doctor[1]}`
  const facility = pathname.match(/^\/centers\/([^/]+)/)
  if (facility) return `facility:${facility[1]}`
  const pharmacy = pathname.match(/^\/pharmacy\/([^/]+)/)
  if (pharmacy) return `pharmacy:${pharmacy[1]}`
  return pathname
}

export function FetchSessionProvider({ children }) {
  const { pathname } = useLocation()
  const scope = sessionScope(pathname)
  const storeRef = useRef({ scope, loaded: new Set() })

  if (storeRef.current.scope !== scope) {
    storeRef.current = { scope, loaded: new Set() }
  }

  const apiRef = useRef({
    isLoaded: (id) => storeRef.current.loaded.has(id),
    markLoaded: (id) => {
      storeRef.current.loaded.add(id)
    },
  })

  return (
    <FetchSessionContext.Provider value={apiRef.current}>
      {children}
    </FetchSessionContext.Provider>
  )
}

const fallback = {
  isLoaded: () => false,
  markLoaded: () => {},
}

export function useFetchSession() {
  return useContext(FetchSessionContext) || fallback
}
