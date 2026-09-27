import RevealItem from './RevealItem'
import { ProfilePage, SectionHead } from './profile/ProfileChrome'
import {
  useAppLocation,
  MAX_SEARCH_RADIUS_KM,
  DEFAULT_SEARCH_RADIUS_KM,
  RADIUS_STEPS_KM,
} from '../features/location'
import { Chip, ChipRow } from './ui'
import './SettingsPage.css'

export default function SearchRadiusSettingsPage() {
  const { radiusKm, setRadiusKm, locality } = useAppLocation()
  const marks = RADIUS_STEPS_KM

  return (
    <ProfilePage title="Search radius" dataset="settings-radius">
      {({ setItemRef, isRevealed, isCached }) => (
        <>
          <RevealItem revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
            <SectionHead title="Nearby discovery" />
            <div className="ds-card is-padded settings-radius-card">
              <p className="ds-body settings-radius-label">
                Within <strong>{radiusKm} km</strong>
                {locality ? ` of ${locality}` : ''}
              </p>
              <p className="ds-caption">
                Used for doctors, pharmacies, healthcare centers, labs, home care, and ambulance.
                Default {DEFAULT_SEARCH_RADIUS_KM} km — applies automatically to every selected location.
              </p>
              <input
                className="settings-radius-slider"
                type="range"
                min={marks[0]}
                max={MAX_SEARCH_RADIUS_KM}
                step={5}
                value={marks.reduce((best, n) => (
                  Math.abs(n - radiusKm) < Math.abs(best - radiusKm) ? n : best
                ))}
                onChange={(e) => {
                  const raw = Number(e.target.value)
                  const next = marks.reduce((best, n) => (
                    Math.abs(n - raw) < Math.abs(best - raw) ? n : best
                  ))
                  setRadiusKm(next)
                }}
                aria-label="Search radius in kilometers"
              />
              <ChipRow label="Radius presets" className="settings-radius-marks">
                {marks.map((n) => (
                  <Chip key={n} size="sm" soft selected={n === radiusKm} onClick={() => setRadiusKm(n)}>
                    {n} km
                  </Chip>
                ))}
              </ChipRow>
            </div>
          </RevealItem>
        </>
      )}
    </ProfilePage>
  )
}
