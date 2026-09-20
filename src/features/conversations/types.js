/**
 * Conversation Center types — adapted from Tabcom message kinds for healthcare.
 */

export const CONVERSATION_KIND = Object.freeze({
  PROVIDER: 'provider',
  SUPPORT: 'support',
})

export const CONVERSATION_STATUS = Object.freeze({
  OPEN: 'open',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  ESCALATED: 'escalated',
})

export const PARTICIPANT_ROLE = Object.freeze({
  PATIENT: 'patient',
  PROVIDER: 'provider',
  SUPPORT_AGENT: 'support_agent',
  SYSTEM: 'system',
})

export const MESSAGE_TYPE = Object.freeze({
  TEXT: 'text',
  SYSTEM: 'system',
  ATTACHMENT: 'attachment',
  IMAGE: 'image',
  FILE: 'file',
  VOICE_NOTE: 'voice_note',
})

export const SUPPORT_CATEGORY = Object.freeze({
  GENERAL: 'general',
  BILLING: 'billing',
  TECHNICAL: 'technical',
  BOOKING: 'booking',
  CLINICAL: 'clinical',
  PHARMACY: 'pharmacy',
  OTHER: 'other',
})

export const SUPPORT_TICKET_STATUS = Object.freeze({
  OPEN: 'open',
  PENDING: 'pending',
  ESCALATED: 'escalated',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
})

export const ATTACHMENT_KIND = Object.freeze({
  PRESCRIPTION: 'prescription',
  LAB_REPORT: 'lab_report',
  INVOICE: 'invoice',
  MEDICAL_IMAGE: 'medical_image',
  PDF: 'pdf',
  VOICE_NOTE: 'voice_note',
  OTHER: 'other',
})

export const EVENT_TYPE = Object.freeze({
  CREATED: 'created',
  ASSIGNED: 'assigned',
  ESCALATED: 'escalated',
  RESOLVED: 'resolved',
  REOPENED: 'reopened',
  CLOSED: 'closed',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
})

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {'provider'|'support'} kind
 * @property {string} status
 * @property {string|null} subject
 * @property {string|null} booking_ref
 * @property {string|null} appointment_id
 * @property {string|null} pharmacy_order_id
 * @property {string} created_by
 * @property {string|null} last_message_at
 * @property {string|null} last_message_preview
 * @property {object} metadata
 * @property {object|null} [support_ticket]
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} conversation_id
 * @property {string|null} sender_id
 * @property {string} sender_role
 * @property {string} message_type
 * @property {string|null} body
 * @property {object} metadata
 * @property {string|null} client_id
 * @property {string} created_at
 * @property {Array=} attachments
 */
