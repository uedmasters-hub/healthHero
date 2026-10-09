/**
 * Temporary guest profile. Everything here already lives in the local
 * activity queue, search memory, or transaction resume so it can be linked
 * to a patient record after sign-in.
 */
import { getArticleById } from '../../data/articles'
import { readPaymentSession } from '../../lib/paymentSession'
import { getViewedDoctorIds } from '../../lib/recentDoctors'
import { getDoctorById } from '../providers/repository'
import { readPharmacyResume } from '../pharmacy/shopApi'
import { loadRecentSearches } from '../search/recentSearches'
import { listGuestEvents, readGuestCartSnapshot } from './activity'
import { peekGuestResume } from './resume'
import { describeGuestRoute } from './routes'
import { readGuestSavedInsights } from './saved'

const LIMIT = 6

const REASONS = {
  booking: 'Booking waiting for sign-in',
  reschedule: 'Reschedule waiting for sign-in',
  payment: 'Payment waiting for sign-in',
  pharmacy_order: 'Pharmacy order waiting for sign-in',
  prescription_upload: 'Prescription upload waiting for sign-in',
}

function when(value) {
  const time = new Date(value).getTime()
  if (!time) return ''
  const minutes = Math.round((Date.now() - time) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function take(list) {
  return list.slice(0, LIMIT)
}

function pendingItems() {
  const items = []
  const resume = peekGuestResume()
  if (resume?.path && !resume.path.startsWith('/login') && !resume.path.startsWith('/profile')) {
    const doctor = resume.metadata?.doctorName
    const base = REASONS[resume.reason] || 'Continue where you left off'
    items.push({
      id: `resume-${resume.path}`,
      title: doctor ? `${base} · ${doctor}` : base,
      subtitle: when(resume.at),
      href: resume.path,
      state: resume.state || null,
    })
  }

  const cart = readGuestCartSnapshot()
  const lines = cart?.lines || []
  if (lines.length) {
    const count = lines.reduce((sum, line) => sum + (Number(line.quantity) || 1), 0)
    items.push({
      id: 'cart',
      title: count === 1 ? '1 item in your pharmacy cart' : `${count} items in your pharmacy cart`,
      subtitle: 'Kept until you sign in',
      href: '/pharmacy/cart',
    })
  }

  const payment = readPaymentSession()
  if (payment && payment.status !== 'paid' && payment.status !== 'expired') {
    const name = payment.draftBooking?.doctorName || payment.draftBooking?.doctor?.name || ''
    const title = payment.flow === 'reschedule' ? 'Reschedule payment' : 'Payment in progress'
    items.push({
      id: 'payment',
      title: name ? `${title} · ${name}` : title,
      subtitle: 'Kept until you sign in',
      href: payment.flow === 'reschedule' ? '/confirm-reschedule' : '/process-payment',
    })
  }

  const pharmacy = readPharmacyResume()
  if (pharmacy?.drugs?.length) {
    items.push({
      id: 'pharmacy-resume',
      title: 'Prescription draft',
      subtitle: `${pharmacy.drugs.length} item${pharmacy.drugs.length === 1 ? '' : 's'} selected`,
      href: '/pharmacy/checkout',
    })
  }

  return items
}

function viewedItems(events) {
  const items = []
  const seen = new Set()

  const push = (item) => {
    if (!item?.id || seen.has(item.id)) return
    seen.add(item.id)
    items.push(item)
  }

  events.filter((row) => row.eventType === 'view' && row.entityType === 'doctor').forEach((row) => {
    const doctor = getDoctorById(row.entityId)
    push({
      id: `doctor-${row.entityId}`,
      title: row.metadata?.name || doctor?.name || 'Doctor profile',
      subtitle: when(row.occurredAt),
      href: `/doctor/${row.entityId}`,
    })
  })

  getViewedDoctorIds().forEach((id) => {
    const doctor = getDoctorById(id)
    push({
      id: `doctor-${id}`,
      title: doctor?.name || 'Doctor profile',
      subtitle: 'Viewed on this device',
      href: `/doctor/${id}`,
    })
  })

  events.filter((row) => row.eventType === 'view' && row.entityType === 'route').forEach((row) => {
    const described = describeGuestRoute(row.entityId)
    if (!described || described.kind !== 'viewed' || described.entityType === 'doctor') return
    const article = described.entityType === 'insight' ? getArticleById(described.entityId) : null
    push({
      id: `${described.entityType}-${described.entityId}`,
      title: article?.title || row.metadata?.label || described.label,
      subtitle: when(row.occurredAt),
      href: described.href,
    })
  })

  return take(items)
}

function activityItems(events) {
  return take(events.filter((row) => {
    if (row.eventType === 'search' || row.eventType === 'save' || row.eventType === 'unsave') return false
    if (row.eventType === 'view' && row.entityType === 'doctor') return false
    if (row.eventType === 'view' && row.entityType === 'route') {
      const described = describeGuestRoute(row.entityId)
      return described?.kind === 'place'
    }
    return row.eventType === 'view' || row.eventType === 'auth_required'
  }).map((row) => {
    if (row.eventType === 'auth_required') {
      return {
        id: row.idempotencyKey,
        title: REASONS[row.entityType] || 'Sign-in needed to continue',
        subtitle: when(row.occurredAt),
        href: row.entityId && String(row.entityId).startsWith('/') ? String(row.entityId).split('?')[0] : null,
      }
    }
    const described = describeGuestRoute(row.entityId)
    return {
      id: row.idempotencyKey,
      title: row.metadata?.label || described?.label || 'Opened a page',
      subtitle: when(row.occurredAt),
      href: described?.href || null,
    }
  }))
}

function searchItems(events) {
  const fromEvents = events.filter((row) => row.eventType === 'search').map((row) => ({
    id: row.idempotencyKey,
    title: row.entityId || row.metadata?.label || 'Search',
    subtitle: [row.metadata?.scope, when(row.occurredAt)].filter(Boolean).join(' · '),
  }))
  const seen = new Set(fromEvents.map((item) => item.title.toLowerCase()))
  const fromSession = loadRecentSearches()
    .filter((item) => item.label && !seen.has(item.label.toLowerCase()))
    .map((item) => ({
      id: `recent-${item.id || item.label}`,
      title: item.label,
      subtitle: item.scope || 'Search',
    }))
  return take([...fromEvents, ...fromSession])
}

function savedItems() {
  return take(readGuestSavedInsights().map((id) => {
    const article = getArticleById(id)
    return {
      id: `saved-${id}`,
      title: article?.title || 'Saved article',
      subtitle: 'Saved on this device',
      href: `/insights/${id}`,
    }
  }))
}

export function buildGuestProfile() {
  const events = listGuestEvents().slice().sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
  return {
    pending: pendingItems(),
    activity: activityItems(events),
    viewed: viewedItems(events),
    saved: savedItems(),
    searches: searchItems(events),
  }
}
