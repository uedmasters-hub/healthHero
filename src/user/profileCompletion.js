/**
 * Profile completion — derived from live user/profile/health data.
 * Single source of truth for hub %, section rows, and avatar rings.
 */

function filled(value) {
  if (value == null) return false
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  return String(value).trim() !== ''
}

function ratio(checks) {
  if (!checks.length) return 0
  const done = checks.filter(Boolean).length
  return Math.round((done / checks.length) * 100)
}

function statusFromPercent(percent) {
  if (percent >= 100) return { label: 'Complete', tone: 'complete' }
  if (percent <= 0) return { label: 'Not started', tone: 'empty' }
  return { label: `${percent}%`, tone: 'partial' }
}

function sectionResult(id, label, path, icon, percent) {
  const status = statusFromPercent(percent)
  return {
    id,
    label,
    path,
    icon,
    percent,
    completed: percent >= 100,
    statusLabel: status.label,
    tone: status.tone,
  }
}

/**
 * Compute completion for the signed-in user snapshot pieces already exposed by useUser.
 */
export function computeProfileCompletion({
  profile,
  health,
  addresses = [],
  emergencyContacts = [],
  insurancePolicies = [],
  paymentMethods = [],
} = {}) {
  const address = addresses.find((item) => item?.isDefault) || addresses[0] || null
  const districtOrCity = address?.city || profile?.city || ''
  const emergency = emergencyContacts[0] || profile?.emergencyContact || {}
  const policy = insurancePolicies[0] || profile?.insurance || null

  const personalPercent = ratio([
    filled(profile?.name),
    filled(profile?.dob) || filled(profile?.age),
    filled(profile?.gender),
    filled(profile?.phone) || filled(profile?.phoneRaw),
    filled(profile?.email),
    filled(profile?.height),
    filled(profile?.weight),
    filled(address?.line) || filled(profile?.address),
  ])

  const medicalPercent = ratio([
    (health?.medications || []).length > 0,
    (health?.allergies || []).length > 0,
    (health?.diagnoses || []).length > 0 || (health?.conditions || []).length > 0,
    (health?.surgeries || []).length > 0 || (health?.vaccinations || []).length > 0,
    filled(emergency?.name) && filled(emergency?.phone),
  ])

  const recordsPercent = ratio([
    (health?.reports || []).length > 0,
    (health?.prescriptions || []).length > 0,
    (health?.consultations || []).length > 0,
  ])

  const insurancePercent = ratio([
    filled(policy?.provider),
    filled(policy?.policyNo),
    filled(policy?.validTill) || filled(policy?.type),
  ])

  const districtPercent = ratio([
    filled(districtOrCity),
    filled(address?.line) || filled(profile?.address),
    filled(profile?.bloodGroup),
  ])

  const paymentPercent = (paymentMethods || []).length > 0 ? 100 : 0

  const sections = [
    sectionResult('personal', 'Personal', '/profile/personal', 'person', personalPercent),
    sectionResult('medical', 'Medical', '/profile/medical', 'medical', medicalPercent),
    sectionResult('records', 'Health Records', '/profile/records', 'records', recordsPercent),
    sectionResult('insurance', 'Insurance', '/profile/insurance', 'insurance', insurancePercent),
    sectionResult('district', 'District & Health ID', '/profile/personal', 'district', districtPercent),
    sectionResult('payment', 'Payment', '/profile/account', 'payment', paymentPercent),
  ]

  const completedCount = sections.filter((s) => s.completed).length
  const totalCount = sections.length
  const percent = Math.round(
    sections.reduce((sum, s) => sum + s.percent, 0) / Math.max(1, totalCount),
  )

  return {
    percent: Math.min(100, Math.max(0, percent)),
    completedCount,
    totalCount,
    sections,
    summary: `${completedCount} of ${totalCount} completed · ${percent}%`,
    isComplete: percent >= 100 && completedCount === totalCount,
  }
}

export const PROFILE_COMPLETION_RING_PX = 1.5
