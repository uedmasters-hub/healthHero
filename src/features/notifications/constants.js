import { BRAND_STORAGE } from '../../lib/brand'

export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  PRESCRIPTION: 'prescription',
  RESULTS: 'results',
  VACCINATION: 'vaccination',
  INSURANCE: 'insurance',
  HEALTH_TIP: 'health_tip',
  TELEHEALTH: 'telehealth',
  EMERGENCY: 'emergency',
  PROFILE: 'profile',
  BOOKING: 'booking',
}

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
}

export const MAX_NOTIFICATIONS = 100
export const AUTO_GENERATE_INTERVAL_MS = 10 * 60 * 1000
export const SEED_KEY = BRAND_STORAGE.notificationsSeed
