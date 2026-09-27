/**
 * Smart Relay presentation. Pure facts in, one card description out.
 * Every screen reads this instead of keeping its own status copy.
 */

export const RELAY = Object.freeze({
  UPCOMING: 'upcoming',
  CHECK_IN: 'check_in',
  VISIT: 'visit',
  WAITING: 'waiting_provider',
  REPORTED: 'report_submitted',
  CONFIRMED: 'provider_confirmed',
  PRESCRIPTION: 'prescription_ready',
  TESTS: 'tests_ordered',
  REFERRAL: 'referral',
  FOLLOW_UP: 'follow_up',
  CANCELLED: 'cancelled',
  MISSED: 'missed',
})

const OFFICIAL_PRIORITY = ['prescription', 'tests', 'referral', 'follow_up']

function action(id, label, tone = 'primary', extra = {}) {
  return { id, label, tone, disabled: false, ...extra }
}

function viewDetails() {
  return action('details', 'View details', 'primary', { ariaLabel: 'View details in Care Hub' })
}

function card(spec) {
  const provided = (spec.actions || []).filter((item) => item && !item.disabled)
  const actions = (provided.length ? provided : [viewDetails()]).slice(0, 2)
  return {
    state: spec.state,
    label: spec.label,
    context: spec.context,
    status: spec.status || spec.label,
    sectionLabel: spec.sectionLabel || spec.context,
    accent: spec.accent,
    message: spec.message,
    actions,
    phase: spec.phase,
    home: spec.home === true,
    homeBand: spec.homeBand === 1 ? 1 : 0,
    archive: spec.archive === true,
    path: spec.path || null,
    layout: spec.layout || 'schedule',
    reportedAt: spec.reportedAt || null,
  }
}

function booked(path, actions = [viewDetails()]) {
  return card({
    state: RELAY.UPCOMING,
    label: 'Booked',
    context: 'Upcoming',
    status: 'Booked',
    sectionLabel: 'Upcoming',
    accent: 'upcoming',
    message: 'Your visit is scheduled.',
    actions,
    phase: 'upcoming',
    home: true,
    homeBand: 0,
    archive: false,
    path,
    layout: 'compact',
  })
}

function officialSpec(key) {
  if (key === 'prescription') {
    return {
      state: RELAY.PRESCRIPTION,
      label: 'Prescription Ready',
      status: 'Ready',
      sectionLabel: 'Prescription Ready',
      accent: 'prescription',
      message: 'Your prescription is ready in Care Hub.',
    }
  }
  if (key === 'tests') {
    return {
      state: RELAY.TESTS,
      label: 'Tests Ordered',
      status: 'Tests',
      sectionLabel: 'Tests Ordered',
      accent: 'tests',
      message: 'Tests were ordered for this visit.',
    }
  }
  if (key === 'referral') {
    return {
      state: RELAY.REFERRAL,
      label: 'Referral',
      sectionLabel: 'Referral',
      accent: 'referral',
      message: 'A referral was added for this visit.',
    }
  }
  if (key === 'follow_up') {
    return {
      state: RELAY.FOLLOW_UP,
      label: 'Follow-up',
      status: 'Follow-up',
      sectionLabel: 'Follow-up',
      accent: 'follow',
      message: 'A follow-up was scheduled for this visit.',
    }
  }
  return {
    state: RELAY.CONFIRMED,
    label: 'Confirmed',
    status: 'Confirmed',
    sectionLabel: 'Confirmed',
    accent: 'confirmed',
    message: 'Your provider confirmed this visit.',
  }
}

/**
 * @param {object} facts
 * @param {string} facts.status
 * @param {string} facts.phase
 * @param {boolean} facts.hasReport
 * @param {string|null} facts.reportedAt
 * @param {boolean} facts.providerDone
 * @param {string[]} facts.officialKeys
 * @param {boolean} facts.postVisitOpen
 * @param {boolean} facts.terminalRecent
 * @param {boolean} facts.video
 * @param {boolean} facts.prepared
 * @param {boolean} facts.checkedIn
 * @param {string} [facts.visitLabel]
 * @param {string} [facts.visitMessage]
 */
export function relayFromFacts(facts = {}) {
  const status = String(facts.status || '')
  const phase = String(facts.phase || '')
  const officialKeys = Array.isArray(facts.officialKeys) ? facts.officialKeys : []

  if (status === 'cancelled' || status === 'refunded' || status === 'expired') {
    const recent = facts.terminalRecent === true
    return card({
      state: RELAY.CANCELLED,
      label: 'Cancelled',
      context: 'Cancelled',
      status: 'Cancelled',
      sectionLabel: 'Cancelled',
      accent: 'cancelled',
      message: 'This visit was cancelled.',
      actions: [
        action('book', 'Book again'),
        action('contact', 'Contact clinic', 'secondary', { ariaLabel: 'Contact clinic' }),
      ],
      phase: 'care_history',
      home: recent,
      homeBand: 1,
      archive: !recent,
      path: '/treat',
      layout: 'prompt',
    })
  }

  if (status === 'no_show') {
    const recent = facts.terminalRecent === true
    return card({
      state: RELAY.MISSED,
      label: 'Missed',
      context: 'Missed',
      status: 'Missed',
      sectionLabel: 'Missed',
      accent: 'missed',
      message: 'This visit was missed.',
      actions: [
        action('book', 'Book again'),
        action('contact', 'Contact clinic', 'secondary', { ariaLabel: 'Contact clinic' }),
      ],
      phase: 'care_history',
      home: recent,
      homeBand: 1,
      archive: !recent,
      path: '/treat',
      layout: 'prompt',
    })
  }

  if (phase === 'visit_checkin') {
    return card({
      state: RELAY.CHECK_IN,
      label: 'Check-in',
      context: 'Active',
      status: 'Checked-in',
      sectionLabel: 'Active',
      accent: 'checkin',
      message: 'Have you completed your visit?',
      actions: [
        action('yes', 'Yes', 'primary', { ariaLabel: 'Yes, visit is complete' }),
        action('not_yet', 'Not yet', 'secondary', { ariaLabel: 'Not yet — keep visit in progress' }),
      ],
      phase,
      home: true,
      homeBand: 0,
      archive: false,
      path: '/appointment',
      layout: 'prompt',
    })
  }

  if (phase === 'active_visit') {
    return card({
      state: RELAY.VISIT,
      label: facts.visitLabel || 'Visit in progress',
      context: 'Active',
      status: facts.visitLabel === 'Visit paused'
        ? 'Paused'
        : facts.visitLabel === 'Tests in progress'
          ? 'Testing'
          : 'In progress',
      sectionLabel: 'Active',
      accent: 'visit',
      message: facts.visitMessage || 'Still with your care team?',
      actions: [
        action('yes', 'Yes', 'primary', { ariaLabel: 'Yes, complete visit' }),
        action('more', 'More options', 'secondary', { ariaLabel: 'More visit options' }),
      ],
      phase,
      home: true,
      homeBand: 0,
      archive: false,
      path: '/appointment',
      layout: 'prompt',
    })
  }

  if (phase === 'waiting_provider') {
    if (facts.hasReport) {
      return card({
        state: RELAY.REPORTED,
        label: 'Report Submitted',
        context: 'Waiting',
        status: 'Submitted',
        sectionLabel: 'Waiting',
        accent: 'reported',
        message: 'Waiting for your provider to confirm your report.',
        reportedAt: facts.reportedAt || null,
        actions: [viewDetails()],
        phase,
        home: true,
        homeBand: 0,
        archive: false,
        path: '/appointment',
        layout: 'prompt',
      })
    }
    return card({
      state: RELAY.WAITING,
      label: 'Waiting for provider',
      context: 'Waiting',
      status: 'Waiting',
      sectionLabel: 'Waiting',
      accent: 'waiting',
      message: 'Waiting for your provider to confirm outcomes.',
      actions: [
        action('report', 'Report visit', 'primary', { ariaLabel: 'Report what happened after the visit' }),
        action('contact', 'Contact clinic', 'secondary', { ariaLabel: 'Contact clinic' }),
      ],
      phase,
      home: true,
      homeBand: 0,
      archive: false,
      path: '/post-visit-report',
      layout: 'prompt',
    })
  }

  if (
    facts.providerDone
    || phase === 'post_visit'
    || (phase === 'care_history' && status === 'completed')
  ) {
    const key = OFFICIAL_PRIORITY.find((id) => officialKeys.includes(id)) || null
    const spec = officialSpec(key)
    const open = phase === 'post_visit' || facts.postVisitOpen === true
    const outcomeAction = key === 'prescription'
      ? action('details', 'View prescription', 'primary', { ariaLabel: 'View prescription', careFocus: 'prescription' })
      : key === 'tests'
        ? action('details', 'View tests', 'primary', { ariaLabel: 'View tests', careFocus: 'investigations' })
        : key === 'referral'
          ? action('details', 'View referral', 'primary', { ariaLabel: 'View referral', careFocus: 'referral' })
          : viewDetails()
    const onHome = open
    return card({
      ...spec,
      context: onHome ? 'Post Visit' : 'Completed',
      sectionLabel: onHome ? 'Post Visit' : 'Completed',
      actions: [outcomeAction],
      phase: open ? 'post_visit' : 'care_history',
      home: open,
      homeBand: 1,
      archive: !open,
      path: '/post-visit-summary',
      layout: 'schedule',
    })
  }

  if (phase === 'upcoming') {
    const reschedule = action('reschedule', 'Reschedule', 'secondary', { ariaLabel: 'Reschedule appointment' })
    if (facts.video) {
      return booked('/video/join', [
        action('join', 'Join', 'primary', { ariaLabel: 'Join consultation' }),
        reschedule,
      ])
    }
    const path = facts.checkedIn
      ? '/pre-checkin'
      : (!facts.prepared ? '/prepare-visit' : '/appointment')
    return booked(path, [viewDetails(), reschedule])
  }

  return null
}
