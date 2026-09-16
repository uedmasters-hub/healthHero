/** Service-type catalog for multi-vertical bookings */

export const SERVICE_TYPE = Object.freeze({
  DOCTOR_CONSULTATION: 'doctor_consultation',
  VIRTUAL_CONSULTATION: 'virtual_consultation',
  PHARMACY_DELIVERY: 'pharmacy_delivery',
  HOME_CARE_NURSING: 'home_care_nursing',
  LAB_TEST: 'lab_test',
})

export const SERVICE_TYPE_META = Object.freeze({
  [SERVICE_TYPE.DOCTOR_CONSULTATION]: {
    label: 'Doctor Consultation',
    shortLabel: 'Consultation',
    cta: 'Prepare for My Visit',
    icon: 'doctor',
  },
  [SERVICE_TYPE.VIRTUAL_CONSULTATION]: {
    label: 'Video Consultation',
    shortLabel: 'Video Consult',
    cta: 'Join Video Consultation',
    icon: 'video',
  },
  [SERVICE_TYPE.PHARMACY_DELIVERY]: {
    label: 'Pharmacy Delivery',
    shortLabel: 'Pharmacy',
    cta: 'Track Delivery',
    icon: 'pharmacy',
  },
  [SERVICE_TYPE.HOME_CARE_NURSING]: {
    label: 'Home Care Nursing',
    shortLabel: 'Home Care',
    cta: 'View Care Plan',
    icon: 'nurse',
  },
  [SERVICE_TYPE.LAB_TEST]: {
    label: 'Lab Test',
    shortLabel: 'Lab Test',
    cta: 'View Instructions',
    icon: 'lab',
  },
})

export function resolveServiceType(recordOrLegacy = {}) {
  if (recordOrLegacy.serviceType && SERVICE_TYPE_META[recordOrLegacy.serviceType]) {
    return recordOrLegacy.serviceType
  }
  const visitType = recordOrLegacy.visitType
    || recordOrLegacy.schedule?.visitType
    || ''
  if (/video|virtual/i.test(visitType)) return SERVICE_TYPE.VIRTUAL_CONSULTATION
  return SERVICE_TYPE.DOCTOR_CONSULTATION
}

export function getServiceMeta(serviceType) {
  return SERVICE_TYPE_META[serviceType] || SERVICE_TYPE_META[SERVICE_TYPE.DOCTOR_CONSULTATION]
}

export function getServiceCta(recordOrLegacy, journeyCta) {
  const type = resolveServiceType(recordOrLegacy)
  if (
    recordOrLegacy.paymentPending
    || recordOrLegacy.status === 'payment_pending'
    || recordOrLegacy.status === 'pending_payment'
    || recordOrLegacy.status === 'payment_processing'
  ) {
    return 'Complete payment'
  }
  if (type === SERVICE_TYPE.DOCTOR_CONSULTATION || type === SERVICE_TYPE.VIRTUAL_CONSULTATION) {
    return journeyCta || getServiceMeta(type).cta
  }
  return getServiceMeta(type).cta
}

export const HOME_CAROUSEL_LIMIT = 4
