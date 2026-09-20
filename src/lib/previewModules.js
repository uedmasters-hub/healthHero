import { SERVICE_TYPE } from '../booking/serviceTypes'

export const PREVIEW_SERVICE_TYPES = new Set([
  SERVICE_TYPE.PHARMACY_DELIVERY,
  SERVICE_TYPE.LAB_TEST,
  SERVICE_TYPE.HOME_CARE_NURSING,
])

export const PREVIEW_PATHS = new Set([])

export function isPreviewServiceType(serviceType) {
  return PREVIEW_SERVICE_TYPES.has(serviceType)
}

export function isPreviewPath(path) {
  if (!path) return false
  const pathname = String(path).split('?')[0]
  return PREVIEW_PATHS.has(pathname)
}
