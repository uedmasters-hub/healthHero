import { useMemo } from 'react'
import RevealItem from './RevealItem'
import { ProfilePage, SectionHead } from './profile/ProfileChrome'
import {
  useAppLocation,
  MIN_SEARCH_RADIUS_KM,
  MAX_SEARCH_RADIUS_KM,
  DEFAULT_SEARCH_RADIUS_KM,
} from '../features/location'
import './SettingsPage.css'

export default function SearchRadiusSettingsPage() {
  const { radiusKm, setRadiusKm, locality } = useAppLocation()
  const marks = useMemo(() => {
    const values = []
    for (let n = MIN_SEARCH_RADIUS_KM; n <= MAX_SEARCH_RADIUS_KM; n += 10) values.push(n)
    return values
  }, [])

  return (
    <ProfilePage title="Search radius" dataset="settings-radius">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem className="user-profile-section" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <SectionHead title="Nearby discovery" />
            <div className="settings-card settings-radius-card">
              <p className="settings-radius-label">
                Within <strong>{radiusKm} km</strong>
                {locality ? ` of ${locality}` : ''}
              </p>
              <p className="settings-radius-hint">
                Used for doctors, pharmacies, healthcare centers, labs, home care, and ambulance.
                Default {DEFAULT_SEARCH_RADIUS_KM} km — applies automatically to every selected location.
              </p>
              <input
                className="settings-radius-slider"
                type="range"
                min={MIN_SEARCH_RADIUS_KM}
                max={MAX_SEARCH_RADIUS_KM}
                step={10}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                aria-label="Search radius in kilometers"
              />
              <div className="settings-radius-marks" aria-hidden="true">
                {marks.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`settings-radius-mark ${n === radiusKm ? 'is-active' : ''}`}
                    onClick={() => setRadiusKm(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </RevealItem>
        </>
      )}
    </ProfilePage>
  )
}
