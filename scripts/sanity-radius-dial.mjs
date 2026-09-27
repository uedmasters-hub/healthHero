import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { availabilityWindow } from '../src/lib/availabilityWindow.js'
import {
  RADIUS_DIAL_STEPS,
  RADIUS_REACH,
  RADIUS_REACH_SLACK,
  emptyDateLabel,
  formatRadiusDate,
  indexFromReach,
  nationwideEmptyTitle,
  nearbyEmptyTitle,
  NEARBY_EMPTY_HINT,
  NATIONWIDE_EMPTY_HINT,
  pluralSpecialty,
  radiusDialIndex,
  kmFromReach,
  mapZoomForRadius,
  radiusPxPerKm,
  reachForIndex,
  reachForKm,
  reachFromOffset,
  advanceRadiusDrag,
  settleRadiusKm,
} from '../src/lib/radiusDial.js'

assert.deepEqual(RADIUS_DIAL_STEPS.map((step) => step.km), [5, 10, 20, 50, 100])
assert.equal(radiusDialIndex(20), 2)
assert.equal(radiusDialIndex(5), 0)
assert.equal(radiusDialIndex(100), 4)
assert.equal(pluralSpecialty('General Physician'), 'General Physicians')
assert.equal(emptyDateLabel('2026-09-27', null), 'Sep 27')
assert.equal(nearbyEmptyTitle('Sep 27'), 'No doctors are available nearby for Sep 27.')
assert.equal(nationwideEmptyTitle('Sep 27'), 'No doctors are available across Nepal for Sep 27.')
assert.equal(NEARBY_EMPTY_HINT, 'Expand your search or try another day.')
assert.equal(NATIONWIDE_EMPTY_HINT, 'Choose another day.')
assert.equal(RADIUS_REACH.max, 1)
assert.equal(formatRadiusDate(new Date(2026, 8, 28)), 'Sep 28')

const reaches = RADIUS_DIAL_STEPS.map((_, index) => reachForIndex(index))
assert.ok(reaches.every((reach, index) => index === 0 || reach > reaches[index - 1]))
reaches.forEach((reach, index) => {
  assert.equal(indexFromReach(reach), index)
})
assert.equal(indexFromReach(0.2), 0)
assert.equal(indexFromReach(reachFromOffset(100, 0, 100)), RADIUS_DIAL_STEPS.length - 1)
const pulledPast = reachFromOffset(160, 0, 100)
const pulledInside = reachFromOffset(8, 0, 100)
assert.ok(pulledPast > RADIUS_REACH.max)
assert.ok(pulledPast <= RADIUS_REACH.max + RADIUS_REACH_SLACK)
assert.equal(indexFromReach(pulledPast), RADIUS_DIAL_STEPS.length - 1)
assert.ok(pulledInside < RADIUS_REACH.min)
assert.equal(indexFromReach(pulledInside), 0)
assert.equal(kmFromReach(reachForKm(5)), 5)
assert.equal(kmFromReach(reachForKm(100)), 100)
assert.ok(Math.abs(kmFromReach(reachForKm(20)) - 20) < 0.001)
assert.ok(Math.abs(kmFromReach(reachForKm(52)) - 52) < 0.001)
assert.ok(mapZoomForRadius(27.7, 5) > mapZoomForRadius(27.7, 100))
assert.ok(kmFromReach(reachForKm(5) - 0.2) < 5)
assert.ok(kmFromReach(reachForKm(100) + 0.2) > 100)
const slow = advanceRadiusDrag({ km: 20, deltaPx: radiusPxPerKm(160), pxPerSec: 40, pxPerKm: radiusPxPerKm(160) })
assert.ok(Math.abs(slow.km - 21) < 0.05)
assert.equal(slow.quantum, 1)
const fast = advanceRadiusDrag({
  km: 20,
  deltaPx: radiusPxPerKm(160),
  pxPerSec: 1400,
  pxPerKm: radiusPxPerKm(160),
  coarse: true,
})
assert.ok(fast.gain > 3)
assert.ok(fast.km - 20 > 3)
assert.equal(fast.quantum, 10)
assert.equal(settleRadiusKm(23.4, 40, 1), 23)
assert.equal(settleRadiusKm(23.4, 1400, 1) % 10, 0)
assert.equal(settleRadiusKm(4, 1400, -1), 5)
assert.equal(settleRadiusKm(140, 40, 1), 100)
assert.equal(availabilityWindow('2026-09-28').from, '2026-09-28')
assert.equal(availabilityWindow('2026-09-28').until, '2026-09-28')

const dial = readFileSync('src/components/SearchRadiusDial.jsx', 'utf8')
const list = readFileSync('src/components/DoctorList.jsx', 'utf8')
const css = readFileSync('src/components/SearchRadiusDial.css', 'utf8')
const shell = readFileSync('src/components/directory/DirectoryShell.jsx', 'utf8')
assert.match(dial, /role="slider"/)
assert.match(dial, /aria-valuetext/)
assert.match(dial, /navigator\.vibrate/)
assert.match(dial, /is-spring/)
assert.match(dial, /advanceRadiusDrag/)
assert.match(dial, /settleRadiusKm/)
assert.match(dial, /onMapPhase\?\.\('hold'\)/)
assert.match(dial, /previewRef\?\.current\?\.sync/)
assert.match(list, /RadiusMapPreview/)
assert.match(list, /MAP_HOLD_MS = 480/)
assert.match(list, /MAP_FADE_MS = 380/)
assert.match(list, /mapPhaseRef.current !== 'closing'/)
assert.match(list, /mapPhase !== 'open'/)
assert.match(list, /coverListing/)
const preview = readFileSync('src/components/RadiusMapPreview.jsx', 'utf8')
const previewCss = readFileSync('src/components/RadiusMapPreview.css', 'utf8')
assert.match(preview, /getComputedStyle/)
assert.match(preview, /phase === 'closing'/)
assert.match(preview, /radius-map-fade/)
assert.match(preview, /LEVEL_BAND/)
assert.match(preview, /scale\(\$\{scale\}\)/)
assert.match(previewCss, /is-cover/)
assert.doesNotMatch(previewCss, /\.radius-map\.is-open/)
assert.doesNotMatch(dial, /unit: 'Nepal'/)
assert.doesNotMatch(list, /ResultsSortButton/)
assert.match(list, /showLocalDial \|\| nationwideChrome/)
assert.match(list, /Search across Nepal/)
assert.match(list, /Search nearby/)
assert.match(list, /setRadiusKm\(5\)/)
assert.match(list, /setRadiusKm\(10\)/)
assert.match(list, /DatePicker/)
assert.match(list, /listingReveal/)
assert.match(list, /findDoctorDiscovery/)
assert.match(list, /awaitingFirstLocal/)
assert.match(list, /resolveFade/)
assert.match(list, /EntityCardSkeletonStack/)
assert.match(list, /is-listing-enter/)
assert.match(shell, /bare/)
assert.doesNotMatch(list, /\|\| listingReveal/)
assert.match(list, /countProviders\(/)
assert.match(list, /registeredCount/)
assert.doesNotMatch(list, /browseNationwide \|\| Number\(radiusKm\)/)
assert.doesNotMatch(shell, /ResultsSortButton/)
assert.match(shell, /showAvatar=\{!quietHeader\}/)
assert.match(shell, /dir-shell__radius-foot/)
assert.match(css, /radius-flow__action/)
assert.match(css, /background: transparent/)
assert.doesNotMatch(css, /stroke-dasharray/)
assert.match(css, /--radius-spring/)

console.log('sanity-radius-dial ok')
