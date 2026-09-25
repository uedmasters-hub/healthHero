import { useEffect, useMemo, useRef, useState } from 'react'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { SearchField } from './SearchBar'
import { BRAND_LOGO_PATH, BRAND_NAME } from '../lib/brand'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import HeaderActions from './home/HeaderActions'
import {
  useAppLocation,
  searchPlaces,
  PLACE_COORDS,
} from '../features/location'
import { NEPAL_MAJOR_CITIES } from '../data/nepalGeography'
import './Header.css'
import './ExpandRadiusEmpty.css'

const GpsIcon = () => (
  <svg className="location-gps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3.2" />
    <circle cx="12" cy="12" r="8" />
    <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22" />
  </svg>
)

const SUGGESTED_PLACES = [
  ...NEPAL_MAJOR_CITIES,
  'Delhi',
  'Gurugram',
  'Noida',
].filter((name, i, arr) => arr.indexOf(name) === i)

/** Home header — shared LocationContext locality + GPS indicator. */
export default function Header({ endAccessory = null }) {
  const {
    locality,
    source,
    status,
    updating,
    recentLocations,
    requestGps,
    refreshLocation,
    setManualLocation,
    selectPlaceByName,
    radiusKm,
  } = useAppLocation()

  const displayName = locality || (status === 'locating' ? 'Finding…' : 'Set location')
  const fromGps = source === 'gps'
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const [search, setSearch] = useState('')
  const [searchHits, setSearchHits] = useState([])
  const [searching, setSearching] = useState(false)
  const [locateHint, setLocateHint] = useState('')
  const searchAbort = useRef(null)
  const cityReveal = useStaggerReveal({ dataset: isPresented ? 'cities' : null })

  const suggested = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return SUGGESTED_PLACES
    return SUGGESTED_PLACES.filter((city) => city.toLowerCase().includes(needle))
  }, [search])

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setSearchHits([])
      setSearching(false)
      return undefined
    }
    setSearching(true)
    searchAbort.current?.abort?.()
    const controller = new AbortController()
    searchAbort.current = controller
    const timer = window.setTimeout(async () => {
      try {
        const hits = await searchPlaces(q, { limit: 8, signal: controller.signal })
        if (!controller.signal.aborted) setSearchHits(hits)
      } catch {
        if (!controller.signal.aborted) setSearchHits([])
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 280)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [search])

  const closeSheet = () => {
    hide(() => {
      setSearch('')
      setSearchHits([])
      setLocateHint('')
    })
  }

  const pickManual = (place) => {
    if (typeof place === 'string') {
      if (!selectPlaceByName(place)) {
        const coords = PLACE_COORDS[place]
        if (!coords) return
        setManualLocation({ locality: place, ...coords })
      }
    } else {
      setManualLocation({
        locality: place.locality,
        latitude: place.latitude,
        longitude: place.longitude,
        placeId: place.placeId || place.id || null,
      })
    }
    closeSheet()
  }

  const onCurrentLocation = async () => {
    setLocateHint('Allow precise location to continue')
    // Explicit user action — override any prior manual city pick.
    const result = await requestGps({ force: true })
    if (result.ok && !result.skipped) {
      setLocateHint('')
      closeSheet()
      return
    }
    if (result.denied) setLocateHint('Location permission was denied')
    else setLocateHint('Couldn’t fetch your location. Try again.')
  }

  const onRefreshLocation = async () => {
    setLocateHint('Updating your location…')
    const result = await refreshLocation()
    if (result.ok) {
      setLocateHint('')
      closeSheet()
      return
    }
    setLocateHint(result.denied ? 'Location permission was denied' : 'Couldn’t refresh location')
  }

  const locating = status === 'locating' || updating
  const gpsTitle = locating
    ? 'Finding your location…'
    : fromGps
      ? `Current location · ${locality || 'Detected'}`
      : 'Use current location'

  const gpsSub = locating
    ? 'Waiting for precise location'
    : locateHint || `Search within ${radiusKm} km of your position`

  return (
    <>
      <header className="header">
        <div className="header-left">
          <img
            className="header-logo"
            src={BRAND_LOGO_PATH}
            alt={BRAND_NAME}
            width={36}
            height={36}
          />
          <button
            className={`location ${fromGps ? 'is-gps' : ''} ${updating ? 'is-updating' : ''}`}
            type="button"
            onClick={show}
            aria-label={`Location: ${displayName}`}
          >
            <span className="location-pin" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-5.8-7-11a7 7 0 1 1 14 0c0 5.2-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            <span className="location-name">{displayName}</span>
            {fromGps || updating ? (
              <span
                className={`location-gps-dot ${updating ? 'is-pulse' : ''}`}
                title={updating ? 'Updating location' : 'Using GPS'}
                aria-hidden="true"
              />
            ) : null}
            <span className="location-arrow" aria-hidden="true">
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 4.5 6 7.5 9 4.5" />
              </svg>
            </span>
          </button>
        </div>

        <div className="header-end">
          <HeaderActions searchSlot={endAccessory} />
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
            <h3 id="location-sheet-title">Choose location</h3>
            <button type="button" className="ds-sheet-close" onClick={closeSheet} aria-label="Close">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="location-search">
            <SearchField
              placeholder="Search city or area…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="location-list" ref={cityReveal.containerRef}>
            <button
              type="button"
              className={`location-gps ${fromGps ? 'is-selected' : ''} ${locating ? 'is-busy' : ''} ${status === 'denied' ? 'is-alert' : ''}`}
              onClick={onCurrentLocation}
              disabled={locating}
              aria-label={fromGps ? 'Use current GPS location, selected' : 'Use current GPS location'}
              aria-current={fromGps ? 'true' : undefined}
              aria-busy={locating || undefined}
            >
              <span className={`location-gps-mark ${locating ? 'is-spin' : ''}`} aria-hidden="true">
                <GpsIcon />
              </span>
              <span className="location-gps-copy">
                <span className="location-gps-title">{gpsTitle}</span>
                <span className="location-gps-sub">{gpsSub}</span>
              </span>
            </button>

            <button
              type="button"
              className="location-refresh"
              onClick={onRefreshLocation}
              disabled={locating}
              aria-label="Refresh current location"
            >
              Refresh location
            </button>

            {recentLocations?.length ? (
              <div className="location-section" role="group" aria-labelledby="location-recent-label">
                <p className="location-section-label" id="location-recent-label">Recent</p>
                {recentLocations.map((item, i) => {
                  const isActive = locality === item.locality && source !== 'gps'
                  const key = item.placeId
                    || `${String(item.locality || '').toLowerCase()}-${Number(item.latitude).toFixed(3)}-${Number(item.longitude).toFixed(3)}`
                  return (
                    <RevealItem
                      as="button"
                      type="button"
                      key={key}
                      className={`location-item ${isActive ? 'active' : ''}`}
                      revealed={cityReveal.isRevealed(i)}
                      cached={cityReveal.isCached}
                      ref={cityReveal.setItemRef(i)}
                      onClick={() => pickManual(item)}
                      aria-label={isActive ? `${item.locality}, current location` : `Use ${item.locality}`}
                      aria-current={isActive ? 'true' : undefined}
                    >
                      <span className="location-item-pin" aria-hidden="true">◷</span>
                      <span className="location-item-name">{item.locality}</span>
                    </RevealItem>
                  )
                })}
              </div>
            ) : null}

            {searchHits.length ? (
              <div className="location-section" role="group" aria-labelledby="location-search-label">
                <p className="location-section-label" id="location-search-label">
                  {searching ? 'Searching…' : 'Search results'}
                </p>
                {searchHits.map((hit) => (
                  <button
                    type="button"
                    key={hit.id || `${hit.locality}-${hit.latitude}-${hit.longitude}`}
                    className="location-item"
                    onClick={() => pickManual(hit)}
                    aria-label={`Use ${hit.locality}`}
                  >
                    <span className="location-item-pin" aria-hidden="true">⌕</span>
                    <span className="location-item-copy">
                      <span className="location-item-name">{hit.locality}</span>
                      {hit.label && hit.label !== hit.locality ? (
                        <span className="location-item-sub">{hit.label}</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="location-section" role="group" aria-labelledby="location-suggested-label">
              <p className="location-section-label" id="location-suggested-label">Suggested</p>
              {suggested.map((city, i) => {
                const isActive = locality === city && source === 'manual'
                return (
                  <RevealItem
                    as="button"
                    type="button"
                    key={city}
                    className={`location-item ${isActive ? 'active' : ''}`}
                    revealed={cityReveal.isRevealed(i + (recentLocations?.length || 0))}
                    cached={cityReveal.isCached}
                    ref={cityReveal.setItemRef(i + (recentLocations?.length || 0))}
                    onClick={() => pickManual(city)}
                    aria-label={isActive ? `${city}, current location` : `Use ${city}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className="location-item-pin" aria-hidden="true">📍</span>
                    <span className="location-item-name">{city}</span>
                    {isActive ? (
                      <svg className="location-item-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : null}
                  </RevealItem>
                )
              })}
              {!suggested.length && !searchHits.length ? (
                <div className="location-empty" role="status">No places found</div>
              ) : null}
            </div>
          </div>
        </AppBottomSheet>
      )}
    </>
  )
}
