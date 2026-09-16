import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { SearchField } from './SearchBar'
import { useNotifications } from './NotificationContext'
import { useUser } from '../user'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './Header.css'

const indianCities = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Pune',
  'Gurugram',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Kochi',
  'Bhopal',
  'Indore',
  'Nagpur',
  'Surat',
  'Visakhapatnam',
  'Coimbatore',
  'Patna',
  'Thiruvananthapuram',
]

const CITY_ALIASES = {
  'new delhi': 'Delhi',
  'delhi': 'Delhi',
  'ncr': 'Delhi',
  'gurgaon': 'Gurugram',
  'gurugram': 'Gurugram',
  'noida': 'Delhi',
  'bengaluru': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'bombay': 'Mumbai',
  'mumbai': 'Mumbai',
  'madras': 'Chennai',
  'chennai': 'Chennai',
  'calcutta': 'Kolkata',
  'kolkata': 'Kolkata',
  'trivandrum': 'Thiruvananthapuram',
  'thiruvananthapuram': 'Thiruvananthapuram',
  'cochin': 'Kochi',
  'kochi': 'Kochi',
  'vizag': 'Visakhapatnam',
  'visakhapatnam': 'Visakhapatnam',
  'pondicherry': 'Chennai',
}

function matchKnownCity(values) {
  for (const raw of values) {
    if (!raw) continue
    const key = String(raw).toLowerCase().trim()
    if (CITY_ALIASES[key]) return CITY_ALIASES[key]
    const exact = indianCities.find((city) => city.toLowerCase() === key)
    if (exact) return exact
    const partial = indianCities.find((city) => (
      key.includes(city.toLowerCase()) || city.toLowerCase().includes(key)
    ))
    if (partial) return partial
  }
  return null
}

async function cityFromCoords(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
  const res = await fetch(url)
  if (!res.ok) throw new Error('reverse-geocode-failed')
  const data = await res.json()
  const admin = (data.localityInfo?.administrative || []).map((item) => item.name)
  return (
    matchKnownCity([data.city, data.locality, data.principalSubdivision, ...admin])
    || data.city
    || data.locality
    || null
  )
}

const GpsIcon = () => (
  <svg className="location-gps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.2" />
    <circle cx="12" cy="12" r="8" />
    <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22" />
  </svg>
)

export default function Header() {
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const { profile, isDemo } = useUser()
  const hasUnread = unreadCount > 0
  const [selectedCity, setSelectedCity] = useState(profile?.city || 'Delhi')
  const [fromGps, setFromGps] = useState(false)
  const [locateStatus, setLocateStatus] = useState('idle')
  const [locateHint, setLocateHint] = useState('')
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const [search, setSearch] = useState('')
  const cityReveal = useStaggerReveal({ dataset: isPresented ? 'cities' : null, delay: 180 })

  const filteredCities = indianCities.filter((city) =>
    city.toLowerCase().includes(search.toLowerCase())
  )

  const closeSheet = () => {
    hide(() => {
      setSearch('')
      if (locateStatus !== 'locating') {
        setLocateStatus('idle')
        setLocateHint('')
      }
    })
  }

  const pickCity = (city, gps = false) => {
    setSelectedCity(city)
    setFromGps(gps)
    closeSheet()
  }

  const useCurrentLocation = () => {
    if (locateStatus === 'locating') return
    if (!navigator.geolocation) {
      setLocateStatus('error')
      setLocateHint('Location isn’t supported in this browser')
      return
    }

    setLocateStatus('locating')
    setLocateHint('Allow location access to continue')

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const city = await cityFromCoords(coords.latitude, coords.longitude)
          if (!city) throw new Error('no-city')
          setLocateStatus('idle')
          setLocateHint('')
          pickCity(city, true)
        } catch {
          setLocateStatus('error')
          setLocateHint('Couldn’t find your city. Try searching instead.')
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocateStatus('denied')
          setLocateHint('Location permission was denied')
          return
        }
        setLocateStatus('error')
        setLocateHint('Couldn’t fetch your location. Try again.')
      },
      { enableHighAccuracy: true, timeout: 14000, maximumAge: 60_000 },
    )
  }

  const gpsTitle = locateStatus === 'locating'
    ? 'Finding your city…'
    : fromGps
      ? `Current location · ${selectedCity}`
      : 'Use current location'

  const gpsSub = locateStatus === 'locating'
    ? 'Waiting for location permission'
    : locateHint || 'Ask for permission and detect your city'

  return (
    <>
      <header className="header">
        <div className="header-left">
          <img
            className="header-logo"
            src="/img/health_hero.svg"
            alt="HealthHero"
            width={36}
            height={36}
          />
          <button className="location" type="button" onClick={show} aria-label={`Location: ${selectedCity}`}>
            <span className="location-pin" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-5.8-7-11a7 7 0 1 1 14 0c0 5.2-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            <span className="location-name">{selectedCity}</span>
            <span className="location-arrow" aria-hidden="true">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 4.5 6 7.5 9 4.5" />
              </svg>
            </span>
          </button>
        </div>

        <div className="header-actions">
          <button
            className="notification-btn"
            type="button"
            aria-label="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <svg className="notification-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {hasUnread ? <span className="notification-badge" /> : null}
          </button>
          <button className="avatar" type="button" onClick={() => navigate('/profile')} aria-label="Open profile">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="avatar-img" />
            ) : (
              <span className="avatar-placeholder">{profile?.initials || 'U'}</span>
            )}
            {isDemo ? <span className="pro-badge">PRO</span> : null}
          </button>
        </div>
      </header>

      {isPresented && (
        <AppBottomSheet
          open
          closing={isClosing}
          onClose={closeSheet}
          labelledBy="location-sheet-title"
          sheetClassName="location-modal"
          showHandle
        >
              <div className="ds-sheet-header location-modal-header">
                <h3 id="location-sheet-title">Select City</h3>
                <button type="button" className="ds-sheet-close" onClick={closeSheet} aria-label="Close">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="location-search">
                <SearchField
                  placeholder="Search city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="location-list" ref={cityReveal.containerRef}>
                <button
                  type="button"
                  className={`location-gps ${fromGps ? 'is-selected' : ''} ${locateStatus === 'locating' ? 'is-busy' : ''} ${locateStatus === 'denied' || locateStatus === 'error' ? 'is-alert' : ''}`}
                  onClick={useCurrentLocation}
                  disabled={locateStatus === 'locating'}
                >
                  <span className={`location-gps-mark ${locateStatus === 'locating' ? 'is-spin' : ''}`}>
                    <GpsIcon />
                  </span>
                  <span className="location-gps-copy">
                    <span className="location-gps-title">{gpsTitle}</span>
                    <span className="location-gps-sub">{gpsSub}</span>
                  </span>
                </button>

                {filteredCities.map((city, i) => (
                  <RevealItem
                    as="button"
                    key={city}
                    className={`location-item ${selectedCity === city && !fromGps ? 'active' : ''}`}
                    revealed={cityReveal.isRevealed(i)}
                    cached={cityReveal.isCached}
                    ref={cityReveal.setItemRef(i)}
                    onClick={() => pickCity(city)}
                  >
                    <span className="location-item-pin">📍</span>
                    <span className="location-item-name">{city}</span>
                    {selectedCity === city && !fromGps && (
                      <svg className="location-item-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </RevealItem>
                ))}
                {filteredCities.length === 0 && (
                  <div className="location-empty">No cities found</div>
                )}
              </div>
        </AppBottomSheet>
      )}
    </>
  )
}
