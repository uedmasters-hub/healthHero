/**
 * Sanity: Recent Locations behave as an MRU list
 * (dedupe by normalized identity, move-to-top, cap, migrate duplicates).
 */
import {
  LOCATION_RECENTS_MAX,
  locationIdentity,
  canonicalLocality,
  normalizeLocalityLabel,
} from '../src/features/location/constants.js'
import {
  dedupeRecentList,
  normalizeRecent,
  pushRecentLocation,
} from '../src/features/location/recent.js'

const delhi = { locality: 'Delhi', latitude: 28.6139, longitude: 77.2090, source: 'manual' }
const delhiSpaced = { locality: '  delhi  ', latitude: 28.61391, longitude: 77.20901, source: 'manual' }
const newDelhi = { locality: 'New Delhi', latitude: 28.6139, longitude: 77.2090, source: 'manual' }
const ktm = { locality: 'Kathmandu', latitude: 27.7172, longitude: 85.3240, source: 'manual' }
const pokhara = { locality: 'Pokhara', latitude: 28.2096, longitude: 83.9856, source: 'manual' }

const duplicatedHistory = [
  { ...ktm, at: '2026-09-25T10:00:00.000Z' },
  { ...delhi, at: '2026-09-25T09:00:00.000Z' },
  { ...delhiSpaced, at: '2026-09-25T08:00:00.000Z' },
  { ...newDelhi, at: '2026-09-25T07:00:00.000Z' },
  { ...delhi, at: '2026-09-25T06:00:00.000Z' },
  { ...delhi, at: '2026-09-25T05:00:00.000Z' },
  { ...delhi, at: '2026-09-25T04:00:00.000Z' },
  { ...delhi, at: '2026-09-25T03:00:00.000Z' },
  { ...delhi, at: '2026-09-25T02:00:00.000Z' },
]

const migrated = dedupeRecentList(duplicatedHistory)
const afterMru = normalizeRecent(migrated, delhi)
const afterMove = normalizeRecent(
  [
    { ...ktm, at: '2026-09-25T12:00:00.000Z' },
    { ...delhi, at: '2026-09-25T11:00:00.000Z' },
    { ...pokhara, at: '2026-09-25T10:00:00.000Z' },
  ],
  delhi,
)

const overflowSeed = Array.from({ length: 12 }, (_, i) => ({
  locality: `City${i}`,
  latitude: 27 + i * 0.1,
  longitude: 85 + i * 0.1,
  source: 'manual',
  at: `2026-09-25T${String(10 + i).padStart(2, '0')}:00:00.000Z`,
}))
const capped = normalizeRecent(overflowSeed.slice(1), overflowSeed[0])

const identities = {
  delhi: locationIdentity(delhi),
  delhiSpaced: locationIdentity(delhiSpaced),
  newDelhi: locationIdentity(newDelhi),
  canonicalNew: canonicalLocality(newDelhi),
  normLabel: normalizeLocalityLabel('  DeLhi '),
}

const pushed = pushRecentLocation({ recent: duplicatedHistory }, delhi)

const delhiCount = (list) => list.filter((x) => locationIdentity(x) === identities.delhi).length

const result = {
  max: LOCATION_RECENTS_MAX,
  identities,
  migratedLen: migrated.length,
  migratedLocalities: migrated.map((x) => x.locality),
  migratedDelhiCount: delhiCount(migrated),
  afterMruTop: afterMru[0]?.locality,
  afterMruDelhiCount: delhiCount(afterMru),
  afterMoveTop: afterMove[0]?.locality,
  afterMoveOrder: afterMove.map((x) => x.locality),
  cappedLen: capped.length,
  pushedDelhiCount: delhiCount(pushed),
  pushedTop: pushed[0]?.locality,
}

console.log(JSON.stringify(result, null, 2))

const asserts = [
  LOCATION_RECENTS_MAX >= 5 && LOCATION_RECENTS_MAX <= 10,
  identities.delhi === identities.delhiSpaced,
  identities.delhi === identities.newDelhi,
  identities.canonicalNew === 'Delhi',
  identities.normLabel === 'delhi',
  migrated.length === 2,
  result.migratedDelhiCount === 1,
  migrated[0].locality === 'Kathmandu',
  migrated[1].locality === 'Delhi',
  afterMru[0].locality === 'Delhi',
  result.afterMruDelhiCount === 1,
  afterMove[0].locality === 'Delhi',
  afterMove[1].locality === 'Kathmandu',
  afterMove[2].locality === 'Pokhara',
  capped.length === LOCATION_RECENTS_MAX,
  result.pushedDelhiCount === 1,
  pushed[0].locality === 'Delhi',
]

if (!asserts.every(Boolean)) {
  console.error('ASSERT FAIL', asserts)
  process.exit(1)
}
console.log('OK')
