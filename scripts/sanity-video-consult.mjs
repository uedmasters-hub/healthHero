import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PROVIDER_ORDER,
  READINESS_MS,
  SESSION_EVENTS,
  appointmentRoomName,
  confirmAndProvision,
  isReadinessRoom,
  outcomeForScore,
  readinessRoomName,
  scoreReadiness,
  selectTransport,
} from '../supabase/functions/_shared/videoEngine.mjs'
import { slotsForVideoDoctor, supportsVideo, videoDoctorsWithSlots } from '../src/features/videoConsult/catalog.js'
import { bookableSlots } from '../src/lib/slotAvailability.js'
import { VIDEO_SLOT_PATH, resolveBookingEntry, saveVideoJourney } from '../src/features/videoConsult/lock.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const failures = []

function check(name, ok) {
  if (!ok) failures.push(name)
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}`)
}

const healthy = {
  camera: true,
  microphone: true,
  latencyMs: 40,
  jitterMs: 8,
  packetLoss: 0.005,
  stable: true,
  downlinkMbps: 20,
  uplinkMbps: 5,
  hardwareConcurrency: 8,
  webrtc: true,
  online: true,
}

check('provider order is tabcom, livekit, meet', PROVIDER_ORDER.join() === 'tabcom,livekit,meet')
check('readiness window is 10 to 15 seconds', READINESS_MS >= 10_000 && READINESS_MS <= 15_000)
check('lifecycle events', SESSION_EVENTS.join() === 'readiness_started,quality_passed,quality_failed,session_provisioned,joined,ended')
check('readiness room', readinessRoomName('abc') === 'readiness-abc' && isReadinessRoom(readinessRoomName('readiness-abc')))
check('appointment room', appointmentRoomName('bk_1') === 'appointment-bk_1' && !isReadinessRoom(appointmentRoomName('bk_1')))

const strong = scoreReadiness(healthy)
check('strong path scores ready', outcomeForScore(strong) === 'ready' && strong >= 75)
check('missing camera is poor', outcomeForScore(scoreReadiness({ ...healthy, camera: false })) === 'poor')
const usableScore = scoreReadiness({
  camera: true,
  microphone: true,
  latencyMs: 200,
  jitterMs: 30,
  packetLoss: 0.02,
  stable: true,
  downlinkMbps: 1.5,
  uplinkMbps: 0.2,
  hardwareConcurrency: 2,
})
check('middling path is usable', outcomeForScore(usableScore) === 'usable')

check('healthy peer stays on the primary engine', selectTransport({
  ...healthy,
  outcome: 'ready',
  livekitConfigured: true,
  meetAvailable: true,
}).provider === 'tabcom')
check('weak realtime path uses the managed fallback', selectTransport({
  webrtc: true,
  camera: true,
  microphone: true,
  latencyMs: 400,
  packetLoss: 0.02,
  outcome: 'usable',
  livekitConfigured: true,
  meetAvailable: true,
  online: true,
}).provider === 'livekit')
check('no peer connection uses the compatibility fallback', selectTransport({
  webrtc: false,
  camera: true,
  microphone: true,
  outcome: 'usable',
  livekitConfigured: true,
  meetAvailable: true,
  online: true,
}).provider === 'meet')
check('weak path without managed realtime still uses the primary engine', selectTransport({
  webrtc: true,
  camera: true,
  microphone: true,
  latencyMs: 400,
  packetLoss: 0.02,
  outcome: 'usable',
  livekitConfigured: false,
  meetAvailable: false,
  online: true,
}).provider === 'tabcom')
check('poor quality does not provision', selectTransport({ ...healthy, outcome: 'poor', livekitConfigured: true, meetAvailable: true }).ok === false)
check('offline does not provision', selectTransport({ ...healthy, online: false, outcome: 'ready' }).ok === false)

const order = []
const reserved = await confirmAndProvision({
  reserve: async () => {
    order.push('reserve')
    return { id: 'bk_1', engineId: 'bk_1' }
  },
  provision: async ({ appointmentId }) => {
    order.push(`provision:${appointmentId}`)
    return { sessionId: 's1', roomName: appointmentRoomName(appointmentId), sessionType: 'consultation' }
  },
  slot: { date: '2026-09-27', time: '10:00 AM' },
  capabilities: healthy,
})
check('reserve runs before provision', order.join() === 'reserve,provision:bk_1')
check('provision returns the consultation session', reserved.session.roomName === 'appointment-bk_1')

let provisioned = false
let reservationFailed = false
try {
  await confirmAndProvision({
    reserve: async () => null,
    provision: async () => {
      provisioned = true
      return { roomName: 'appointment-x' }
    },
    slot: {},
    capabilities: healthy,
  })
} catch (err) {
  reservationFailed = err.code === 'reservation_failed'
}
check('failed reserve never provisions', reservationFailed && provisioned === false)

let readinessRejected = false
try {
  await confirmAndProvision({
    reserve: async () => ({ id: 'bk_2' }),
    provision: async () => ({ roomName: 'readiness-temp', sessionId: 's2' }),
    slot: {},
    capabilities: healthy,
  })
} catch (err) {
  readinessRejected = err.code === 'readiness_room'
}
check('readiness room cannot be a consultation', readinessRejected)

const consent = await confirmAndProvision({
  reserve: async () => ({ id: 'bk_3' }),
  provision: async () => ({ needsConsent: true }),
  slot: {},
  capabilities: healthy,
})
check('consent is requested after the appointment is reserved', consent.needsConsent === true && consent.booking.id === 'bk_3' && consent.session === null)

const now = new Date('2026-09-26T08:00:00')
const videoDoctor = { id: 'd1', visitTypes: ['video'] }
const clinicDoctor = { id: 'd2', visitTypes: ['in_person'] }
check('empty visit modes are not video', supportsVideo({ id: 'd3', visitTypes: [] }) === false)
check('in-person schedule is excluded', slotsForVideoDoctor(videoDoctor, [
  { date: '2026-09-27', time: '10:00 AM', visitType: 'In-Person' },
], now).length === 0)
check('past video times are excluded', slotsForVideoDoctor(videoDoctor, [
  { date: '2026-09-25', time: '10:00 AM', visitType: 'Video Consultation' },
], now).length === 0)
const future = slotsForVideoDoctor(videoDoctor, [
  { date: '2026-09-27', time: '10:00 AM', visitType: 'Video Consultation' },
  { date: '2026-09-27', time: '11:00 AM', visitType: 'In-Person' },
], now)
check('future video times are kept', future.length === 1 && future[0].time === '10:00 AM')
check('doctor without video is excluded', slotsForVideoDoctor(clinicDoctor, future, now).length === 0)
const templated = slotsForVideoDoctor(videoDoctor, [], now)
check('an empty live schedule does not invent slots', templated.length === 0)
const offline = slotsForVideoDoctor(videoDoctor, null, now)
check('offline preview can use a template schedule', offline.length > 0 && offline.every((slot) => /video/i.test(slot.visitType)))
const kept = bookableSlots({
  doctorId: 'd1',
  date: { full: new Date('2026-09-27T00:00:00') },
  visitType: 'Video Consultation',
  slots: ['10:00 AM', '11:00 AM'],
  now,
})
check('live slots stay visible on every screen', kept.length === 2)
const listed = videoDoctorsWithSlots(
  [videoDoctor, clinicDoctor],
  new Map([['d1', [{ date: '2026-09-27', time: '10:00 AM', visitType: 'Video Consultation' }]]]),
  now,
)
check('listing keeps only doctors with a future video time', listed.length === 1 && listed[0].doctor.id === 'd1')

const page = read('src/features/videoConsult/VideoConsultPage.jsx')
const css = read('src/features/videoConsult/VideoConsult.css')
const app = read('src/App.jsx')
const actions = read('src/lib/serviceActions.js')
const catalog = read('src/data/searchCatalog.js')
const flow = read('src/components/BookingFlow.jsx')
const card = read('src/components/DoctorCard.jsx')
const profile = read('src/components/DoctorProfile.jsx')
const journey = read('src/lib/appointmentJourney.js')
const migration = read('supabase/migrations/20260926120000_video_sessions.sql')
const edge = read('supabase/functions/video-session/index.ts')
const oauth = read('src/features/auth/services/oauth.js')

function visibleText(source) {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  return [...stripped.matchAll(/>([^<{]+)</g)].map((match) => match[1]).join('\n')
    + [...stripped.matchAll(/aria-label="([^"]+)"/g)].map((match) => match[1]).join('\n')
}
const shown = `${visibleText(page)}\n${css}`
check('the screen does not name a video provider', !/livekit|tabcom|google meet|webrtc/i.test(shown))
check('video routes are registered', app.includes('path="/video"') && app.includes('path="/video/join/:appointmentId"'))
check('search opens the existing booking list', catalog.includes("{ name: 'Video Consultation', to: '/booking' }"))
check('video service stays on the booking screens', actions.includes("navigate('/booking'") && actions.includes('videoLock: true'))
check('booking screens are not replaced by the video page', !flow.includes("navigate('/video'"))
check('book now stays on the slot screen', card.includes("navigate('/booking/slot'") && !card.includes('openVideoJourney'))
check('doctor profile keeps its schedule', profile.includes('<WeeklySchedule') && profile.includes('lockVisitType={videoLocked}') && !profile.includes('enterVideoJourney'))
const schedule = read('src/components/WeeklySchedule.jsx')
const slot = read('src/components/SelectSlot.jsx')
const entity = read('src/components/directory/DoctorEntityCard.jsx')
const list = read('src/components/DoctorList.jsx')
check('the visit toggle is removed only while video is locked', schedule.includes('lockVisitType ? null'))
check('choose date and time keeps the existing schedule', slot.includes('lockVisitType={videoLocked}') && slot.includes('<WeeklySchedule'))
check('in-person chip is dropped in the video list', entity.includes("/video/i.test(String(type))"))
check('the list keeps doctors with a future video time', list.includes('videoOnly: videoLocked') && !list.includes('Load more doctors') && !list.includes('videoKeys'))
check('the video list uses the find-doctor page and total', list.includes('pageSize: PAGE_SIZE') && list.includes('total={totalCount}') && list.includes('dir-shell__scroll-sentinel'))
check('video discovery filters supports_video and future slots', read('src/features/providers/repository.js').includes("videoOnly ? 'v_video_provider_search'") && read('supabase/migrations/20260926143000_video_provider_listing.sql').includes('p.supports_video = true') && read('supabase/migrations/20260926143000_video_provider_listing.sql').includes('provider_has_bookable_video'))
check('/video returns to the booking list', app.includes('function VideoBookingEntry') && app.includes('to="/booking"'))
const readiness = read('src/features/videoConsult/ReadinessPage.jsx')
const provider = read('src/components/SelectProvider.jsx')
const engine = read('src/booking/engine.js')
check('readiness is a full-screen check before booking continues', readiness.includes('aria-label="Video readiness check"') && readiness.includes('startReadiness') && !readiness.includes('provisionConfirmedVisit'))
const previewEngine = read('src/features/videoConsult/tabcomEngine.js')
check('the preview recording stays in memory and can be deleted', previewEngine.includes('startPreviewRecording') && previewEngine.includes('releasePreviewUrl') && readiness.includes('discardPreview') && readiness.includes('never uploaded'))
check('the preview is not uploaded', !readiness.includes('upload(') && !readiness.includes('storage.from') && !readiness.includes('latitude'))
check('permissions are explained before the camera opens', readiness.includes('Let\'s check your video call') && readiness.includes('Start check') && readiness.includes('phase === \'permissions\''))
check('ready to book is its own screen', readiness.includes('You\'re all set') && readiness.includes('phase === \'ready\''))
check('session details include the readiness measurements', edge.includes('locationGranted') && edge.includes('lowPower') && edge.includes('details'))
check('video book now opens readiness first', provider.includes('beginReadiness(navigate, next)'))
check('in-person book now skips readiness', provider.includes("navigate('/booking/slot', { state: next })"))
check('a profile video slot opens readiness before booking', profile.includes('beginReadiness(navigate, next)') && !profile.includes("beginReadiness(navigate, next, '/booking/patient')"))
check('continue to booking opens choose date and time', readiness.includes('navigate(VIDEO_SLOT_PATH, { replace: true, state })'))
check('back from date and time skips the readiness screen', readiness.includes('navigate(VIDEO_SLOT_PATH, { replace: true, state })'))
check('readiness stays in the navigation stack', read('src/features/pushNav/config.js').includes("p === '/video/readiness'"))
check('the temporary readiness session is closed', readiness.includes('closeReadiness'))
check('choose date and time restores the same doctor', slot.includes('resolveBookingEntry'))
check('a saved video visit restores the doctor and date', (() => {
  const memory = new Map()
  globalThis.sessionStorage = {
    getItem: (key) => (memory.has(key) ? memory.get(key) : null),
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
  }
  const saved = saveVideoJourney({
    doctor: { id: 'dr-1', name: 'Maya Sharma' },
    date: { iso: '2026-09-28', full: '2026-09-28T00:00:00.000Z' },
    time: '10:00',
    phase: 'ready',
  }, { replace: true })
  const back = resolveBookingEntry({})
  const revived = back.date?.full instanceof Date && !Number.isNaN(back.date.full.getTime())
  return saved.videoLock && back.doctor?.id === 'dr-1' && revived && back.visitType === 'Video Consultation' && VIDEO_SLOT_PATH === '/booking/slot'
})())
check('the consultation room is provisioned after payment confirms the visit', engine.includes('provisionConfirmedVisit(confirmed)'))
check('upcoming video visits join from the appointment', journey.includes('`/video/join/${id}`') && journey.includes("'Join Consultation'"))
check('sessions table tracks the requested fields', [
  'session_type', 'provider', 'status', 'quality_score', 'latency_ms', 'jitter_ms', 'packet_loss', 'network_type',
].every((field) => migration.includes(field)))
check('session events match the lifecycle', SESSION_EVENTS.every((event) => migration.includes(`'${event}'`)))
check('clients cannot read the provider column', migration.includes('revoke all on public.video_sessions from anon, authenticated'))
check('tokens are minted from project secrets', edge.includes("Deno.env.get('LIVEKIT_API_KEY')") && edge.includes("Deno.env.get('LIVEKIT_API_SECRET')"))
check('readiness uses a temporary room', edge.includes('readinessRoomName') && edge.includes("session_type: 'readiness'"))
check('consultation rooms use the appointment id', edge.includes('appointmentRoomName(appointmentId)'))
check('existing google consent can be extended', oauth.includes('confirmConsultationAccess'))

if (failures.length) {
  console.error(`\n${failures.length} failed`)
  process.exit(1)
}
console.log('\nvideo consult sanity passed')
