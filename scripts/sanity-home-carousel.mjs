/**
 * Sanity: Home appointment journey carousel — relevance sort, limit, empty/one/many.
 * Priority: nearest active/upcoming → later upcoming → outcome still on Home.
 * Finished visits leave the carousel for Care Hub.
 */
import { BOOKING_STATUS } from '../src/booking/constants.js'
import { selectHomeCarousel } from '../src/booking/selectors.js'
import { resolveVisitPhase, VISIT_PHASE } from '../src/booking/visitLifecycle.js'
import { HOME_CAROUSEL_LIMIT } from '../src/booking/serviceTypes.js'

const now = new Date('2026-09-26T12:00:00+05:30')

function mk(id, status, startIso, timeStr = '10:00 AM', extra = {}) {
  const start = new Date(startIso)
  const meta = {
    createdAt: startIso,
    updatedAt: startIso,
    ...(extra.meta || {}),
  }
  return {
    id,
    status,
    schedule: {
      date: { full: start },
      time: timeStr,
      duration: 30,
    },
    meta,
    ...extra,
    meta,
  }
}

const postVisit = mk(
  'post',
  BOOKING_STATUS.COMPLETED,
  '2026-09-26T09:00:00+05:30',
  '9:00 AM',
  {
    meta: {
      completedAt: '2026-09-26T10:30:00+05:30',
      postVisitUntil: '2026-09-27T10:30:00+05:30',
    },
  },
)
const postVisitOlder = mk(
  'post-older',
  BOOKING_STATUS.COMPLETED,
  '2026-09-25T09:00:00+05:30',
  '9:00 AM',
  {
    meta: {
      completedAt: '2026-09-25T10:00:00+05:30',
      postVisitUntil: '2026-09-26T18:00:00+05:30',
    },
  },
)
const todayUpcoming = mk(
  'today',
  BOOKING_STATUS.CONFIRMED,
  '2026-09-26T16:00:00+05:30',
  '4:00 PM',
)
const futureA = mk(
  'future-a',
  BOOKING_STATUS.UPCOMING,
  '2026-09-28T10:00:00+05:30',
  '10:00 AM',
)
const futureB = mk(
  'future-b',
  BOOKING_STATUS.CONFIRMED,
  '2026-09-30T11:00:00+05:30',
  '11:00 AM',
)
const checkin = mk(
  'checkin',
  BOOKING_STATUS.AWAITING_COMPLETION,
  '2026-09-26T10:00:00+05:30',
  '10:00 AM',
)
const cancelled = mk(
  'cancelled',
  BOOKING_STATUS.CANCELLED,
  '2026-09-26T08:00:00+05:30',
  '8:00 AM',
)
const careHistory = mk(
  'history',
  BOOKING_STATUS.COMPLETED,
  '2026-09-20T09:00:00+05:30',
  '9:00 AM',
  {
    meta: {
      completedAt: '2026-09-20T10:00:00+05:30',
      postVisitUntil: '2026-09-21T10:00:00+05:30',
    },
  },
)
const careHistoryOlder = mk(
  'history-older',
  BOOKING_STATUS.COMPLETED,
  '2026-09-12T09:00:00+05:30',
  '9:00 AM',
  {
    meta: {
      completedAt: '2026-09-12T10:00:00+05:30',
      postVisitUntil: '2026-09-13T10:00:00+05:30',
    },
  },
)

function idsOf(state, limit = HOME_CAROUSEL_LIMIT) {
  return selectHomeCarousel(state, limit, now).map((b) => b.id)
}

const stateAll = {
  bookings: [futureB, todayUpcoming, postVisit, futureA, checkin, cancelled],
  activeBookingId: null,
}

const ordered = selectHomeCarousel(stateAll, HOME_CAROUSEL_LIMIT, now)
const orderedIds = ordered.map((b) => b.id)
const phases = ordered.map((b) => resolveVisitPhase(b, now))

const empty = selectHomeCarousel({ bookings: [], activeBookingId: null }, 4, now)
const single = selectHomeCarousel(
  { bookings: [futureA], activeBookingId: null },
  4,
  now,
)
const onlyPostAndFuture = idsOf({
  bookings: [futureA, postVisit, futureB],
  activeBookingId: null,
})
const capped = idsOf({
  bookings: [
    postVisit,
    checkin,
    todayUpcoming,
    futureA,
    futureB,
    mk('future-c', BOOKING_STATUS.CONFIRMED, '2026-10-01T10:00:00+05:30', '10:00 AM'),
  ],
  activeBookingId: null,
})
const withHistory = idsOf({
  bookings: [futureA, postVisit, careHistory, futureB],
  activeBookingId: null,
})
const postsThenHistory = idsOf({
  bookings: [postVisitOlder, careHistoryOlder, postVisit, careHistory],
  activeBookingId: null,
})
const historyOnly = idsOf({
  bookings: [careHistoryOlder, careHistory, cancelled],
  activeBookingId: null,
})
const singlePost = idsOf({ bookings: [postVisit], activeBookingId: null }, 1)
const limitOnePrefersUpcoming = idsOf({
  bookings: [postVisit, todayUpcoming],
  activeBookingId: null,
}, 1)

const result = {
  limit: HOME_CAROUSEL_LIMIT,
  orderedIds,
  phases,
  emptyLen: empty.length,
  singleIds: single.map((b) => b.id),
  onlyPostAndFuture,
  capped,
  withHistory,
  postsThenHistory,
  historyOnly,
  singlePost,
  limitOnePrefersUpcoming,
}

console.log(JSON.stringify(result, null, 2))

const asserts = [
  ['limit at least 1', HOME_CAROUSEL_LIMIT >= 1],
  ['empty carousel', empty.length === 0],
  ['single upcoming', single.length === 1 && single[0].id === 'future-a'],
  ['nearest active journey leads', orderedIds[0] === 'checkin'],
  ['lead phase is check-in', phases[0] === VISIT_PHASE.VISIT_CHECKIN],
  ['today follows the nearer check-in', orderedIds.indexOf('checkin') < orderedIds.indexOf('today')],
  ['later upcoming follows today', orderedIds.indexOf('today') < orderedIds.indexOf('future-a')],
  ['post visit stays in the carousel', orderedIds.includes('post')],
  ['post visit follows upcoming', orderedIds.indexOf('future-a') < orderedIds.indexOf('post')],
  ['post visit is not the lead when an upcoming exists', orderedIds[0] !== 'post'],
  ['farthest upcoming yields its slot to post visit', !orderedIds.includes('future-b')],
  ['cancelled stays out', !orderedIds.includes('cancelled')],
  ['upcoming then post visit when all fit', JSON.stringify(onlyPostAndFuture) === JSON.stringify(['future-a', 'future-b', 'post'])],
  ['cap keeps nearest journeys plus post visit', JSON.stringify(capped) === JSON.stringify(['checkin', 'today', 'future-a', 'post'])],
  ['cap length', capped.length === HOME_CAROUSEL_LIMIT],
  ['finished visits leave home for care hub', JSON.stringify(withHistory) === JSON.stringify(['future-a', 'future-b', 'post'])],
  ['open outcomes stay, archived visits leave', JSON.stringify(postsThenHistory) === JSON.stringify(['post', 'post-older'])],
  ['a recent cancellation stays until it archives', JSON.stringify(historyOnly) === JSON.stringify(['cancelled'])],
  ['a lone post visit still appears', singlePost[0] === 'post'],
  ['a single slot prefers the upcoming appointment', limitOnePrefersUpcoming[0] === 'today'],
]

const failed = asserts.filter(([, ok]) => !ok)
if (failed.length) {
  console.error('ASSERT FAIL', failed.map(([name]) => name))
  process.exit(1)
}
console.log('OK')
