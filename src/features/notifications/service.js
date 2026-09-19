import { createNotification, sortByNewest, Types, Priority } from './models'
import { MAX_NOTIFICATIONS, AUTO_GENERATE_INTERVAL_MS, SEED_KEY } from './constants'
import * as repo from './repository'

let listeners = []
let autoTimer = null

function notify() {
  const notifications = repo.getAll()
  const unreadCount = notifications.filter((n) => n.unread).length
  listeners.forEach((fn) => fn({ notifications, unreadCount }))
}

function prune(list) {
  if (list.length <= MAX_NOTIFICATIONS) return list
  const trimmed = list.slice(0, MAX_NOTIFICATIONS)
  repo.save(trimmed)
  return trimmed
}

// ── Seed data ────────────────────────────────────────────────────────────

const SEED_NOTIFICATIONS = [
  {
    title: 'Appointment tomorrow',
    body: 'Dr. Priya Sharma at 10:30 AM. Don\u2019t forget to complete pre-visit check-in.',
    type: Types.APPOINTMENT,
    priority: Priority.HIGH,
    to: '/appointment',
    minutesAgo: 2,
  },
  {
    title: 'Lab results ready',
    body: 'Your blood test from 20 Sep is available to review in your health records.',
    type: Types.RESULTS,
    priority: Priority.NORMAL,
    to: '/post-visit-summary',
    minutesAgo: 45,
  },
  {
    title: 'Prescription refill reminder',
    body: 'Metformin 500mg refill is due. Order from HealthHero Pharmacy for doorstep delivery.',
    type: Types.PRESCRIPTION,
    priority: Priority.NORMAL,
    to: '/pharmacy',
    minutesAgo: 120,
  },
  {
    title: 'Vaccination due',
    body: 'Your annual flu vaccine is due. Schedule at your nearest HealthHero clinic.',
    type: Types.VACCINATION,
    priority: Priority.HIGH,
    to: '/treat',
    minutesAgo: 300,
  },
  {
    title: 'Insurance claim processed',
    body: 'Your claim for Dr. Mehta consultation (₹1,200) has been approved by Star Health.',
    type: Types.INSURANCE,
    priority: Priority.LOW,
    to: '/profile',
    minutesAgo: 1440,
  },
  {
    title: 'Health tip for you',
    body: 'Staying hydrated improves energy and brain function. Aim for 8 glasses daily.',
    type: Types.HEALTH_TIP,
    priority: Priority.LOW,
    to: '',
    minutesAgo: 2880,
  },
  {
    title: 'Telehealth available',
    body: 'Dr. Vivek Menon is available for a video consultation right now.',
    type: Types.TELEHEALTH,
    priority: Priority.NORMAL,
    to: '/treat',
    minutesAgo: 5,
  },
  {
    title: 'Booking confirmed',
    body: 'Your visit with Dr. Arjun Mehta is confirmed for Friday at 4:00 PM.',
    type: Types.BOOKING,
    priority: Priority.NORMAL,
    to: '/treat',
    minutesAgo: 4320,
  },
  {
    title: 'Profile incomplete',
    body: 'Add your blood group and allergies to help doctors provide better care.',
    type: Types.PROFILE,
    priority: Priority.LOW,
    to: '/profile',
    minutesAgo: 7200,
  },
  {
    title: 'Emergency: Dengue alert',
    body: 'Dengue cases are rising in your area. Use mosquito repellent and wear full sleeves.',
    type: Types.EMERGENCY,
    priority: Priority.URGENT,
    to: '',
    minutesAgo: 60,
  },
]

function seedNotifications() {
  if (localStorage.getItem(SEED_KEY)) return false
  const now = Date.now()
  const notifications = SEED_NOTIFICATIONS.map((item) =>
    createNotification({
      title: item.title,
      body: item.body,
      type: item.type,
      priority: item.priority,
      to: item.to,
      unread: item.minutesAgo < 1440,
      timestamp: new Date(now - item.minutesAgo * 60 * 1000).toISOString(),
    })
  ).sort(sortByNewest)
  repo.save(notifications)
  localStorage.setItem(SEED_KEY, '1')
  return true
}

// ── Auto-generation pool ─────────────────────────────────────────────────

const AUTO_POOL = [
  {
    title: 'Appointment reminder',
    body: 'Your appointment with Dr. {doctor} is in {time}. Please arrive 10 minutes early.',
    type: Types.APPOINTMENT,
    priority: Priority.HIGH,
    to: '/appointment',
    doctors: ['Priya Sharma', 'Arjun Mehta', 'Vivek Menon', 'Kabir Sethi'],
    times: ['30 minutes', '1 hour', '2 hours'],
  },
  {
    title: 'Prescription refill due',
    body: '{medication} refill is due. Reorder from the pharmacy to avoid gaps in your treatment.',
    type: Types.PRESCRIPTION,
    priority: Priority.NORMAL,
    to: '/pharmacy',
    medications: ['Metformin 500mg', 'Thyroxine 50mcg', 'Amlodipine 5mg', 'Omeprazole 20mg'],
  },
  {
    title: 'Lab results available',
    body: 'Your {test} results are now available. Tap to review your report.',
    type: Types.RESULTS,
    priority: Priority.NORMAL,
    to: '/post-visit-summary',
    tests: ['blood sugar', 'lipid profile', 'thyroid panel', 'CBC', 'vitamin D'],
  },
  {
    title: 'Health tip of the day',
    body: '{tip}',
    type: Types.HEALTH_TIP,
    priority: Priority.LOW,
    to: '',
    tips: [
      'A 30-minute walk daily can reduce the risk of heart disease by 30%.',
      'Deep breathing for 5 minutes can lower blood pressure and reduce stress.',
      'Eating 5 servings of fruits and vegetables daily boosts immunity.',
      'Sleeping 7-8 hours improves memory and concentration.',
      'Stretching for 10 minutes each morning prevents back pain.',
    ],
  },
  {
    title: 'Telehealth session starting',
    body: 'Your video consultation with {doctor} starts in 15 minutes. Test your camera now.',
    type: Types.TELEHEALTH,
    priority: Priority.HIGH,
    to: '/treat',
    doctors: ['Dr. Priya Sharma', 'Dr. Vivek Menon'],
  },
  {
    title: 'Insurance renewal reminder',
    body: 'Your Star Health policy expires in 30 days. Renew now to avoid coverage gaps.',
    type: Types.INSURANCE,
    priority: Priority.NORMAL,
    to: '/profile',
  },
]

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateNotification() {
  const template = pickRandom(AUTO_POOL)
  let { title, body } = template

  if (template.doctors) body = body.replace('{doctor}', pickRandom(template.doctors))
  if (template.times) body = body.replace('{time}', pickRandom(template.times))
  if (template.medications) body = body.replace('{medication}', pickRandom(template.medications))
  if (template.tests) body = body.replace('{test}', pickRandom(template.tests))
  if (template.tips) body = body.replace('{tip}', pickRandom(template.tips))

  return createNotification({
    title,
    body,
    type: template.type,
    priority: template.priority,
    to: template.to,
  })
}

// ── Public service API ───────────────────────────────────────────────────

export function init() {
  seedNotifications()
  startAutoGenerate()
  notify()
}

export function subscribe(fn) {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function getAll() {
  return repo.getAll()
}

export function getUnreadCount() {
  return repo.getUnreadCount()
}

export function markRead(id) {
  repo.update(id, { unread: false })
  notify()
}

export function markAllRead() {
  const list = repo.getAll().map((n) => ({ ...n, unread: false }))
  repo.save(list)
  notify()
}

export function clearNotification(id) {
  repo.remove(id)
  notify()
}

export function clearAll() {
  repo.clear()
  notify()
}

export function pushNotification(data) {
  const notification = createNotification(data)
  prune(repo.append(notification))
  notify()
  return notification
}

export function startAutoGenerate() {
  stopAutoGenerate()
  autoTimer = setInterval(() => {
    const notification = generateNotification()
    prune(repo.append(notification))
    notify()
  }, AUTO_GENERATE_INTERVAL_MS)
}

export function stopAutoGenerate() {
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = null
  }
}

export function destroy() {
  stopAutoGenerate()
  listeners = []
}
