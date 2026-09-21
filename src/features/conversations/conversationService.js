/**
 * Conversation Center service — persistent Supabase messaging.
 * Inspired by Tabcom inbox/thread patterns; messages are stored (not relayed).
 */
import { requireSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { getBookingEngine } from '../../booking/engine'
import { syncAppointmentRecord } from '../../booking/appointmentSync'
import {
  CONVERSATION_KIND,
  CONVERSATION_STATUS,
  EVENT_TYPE,
  MESSAGE_TYPE,
  PARTICIPANT_ROLE,
  SUPPORT_CATEGORY,
  SUPPORT_TICKET_STATUS,
} from './types'

function mapError(error, fallback = 'Something went wrong.') {
  return error?.message || fallback
}

function previewFromBody(body) {
  return String(body || '').replace(/\s+/g, ' ').trim().slice(0, 160)
}

async function insertEvent(conversationId, eventType, actorId, payload = {}) {
  const supabase = requireSupabase()
  await supabase.from('conversation_events').insert({
    conversation_id: conversationId,
    event_type: eventType,
    actor_id: actorId || null,
    payload,
  })
}

async function ensureParticipant(conversationId, userId, role) {
  const supabase = requireSupabase()
  const { data: existing } = await supabase
    .from('conversation_participants')
    .select('id, left_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()

  if (existing) return existing

  const { data, error } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

/** List inbox conversations for the current user (participant). */
export async function listInbox() {
  if (!isSupabaseConfigured) return { ok: true, conversations: [], offline: true }
  const supabase = requireSupabase()

  const { data: parts, error: partsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at, role')
    .is('left_at', null)

  if (partsError) return { ok: false, error: mapError(partsError), conversations: [] }

  const ids = (parts || []).map((p) => p.conversation_id)
  if (!ids.length) return { ok: true, conversations: [] }

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      support_tickets (
        id, ticket_id, category, status, assigned_team, assigned_to, booking_ref, appointment_id
      )
    `)
    .in('id', ids)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) return { ok: false, error: mapError(error), conversations: [] }

  const readMap = Object.fromEntries((parts || []).map((p) => [p.conversation_id, p]))
  const conversations = (data || []).map((row) => {
    const ticket = Array.isArray(row.support_tickets)
      ? row.support_tickets[0]
      : row.support_tickets
    const part = readMap[row.id]
    const unread = Boolean(
      row.last_message_at
      && (!part?.last_read_at || new Date(row.last_message_at) > new Date(part.last_read_at)),
    )
    return {
      ...row,
      support_ticket: ticket || null,
      support_tickets: undefined,
      unread,
      participant_role: part?.role || null,
    }
  })

  return { ok: true, conversations }
}

export async function getConversation(conversationId) {
  if (!conversationId) return { ok: false, error: 'Missing conversation.' }
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      support_tickets (
        id, ticket_id, category, status, assigned_team, assigned_to, booking_ref, appointment_id
      )
    `)
    .eq('id', conversationId)
    .maybeSingle()

  if (error) return { ok: false, error: mapError(error) }
  if (!data) return { ok: false, error: 'Conversation not found.' }

  const ticket = Array.isArray(data.support_tickets)
    ? data.support_tickets[0]
    : data.support_tickets

  return {
    ok: true,
    conversation: {
      ...data,
      support_ticket: ticket || null,
      support_tickets: undefined,
    },
  }
}

/**
 * Get or create a provider conversation permanently linked to a booking.
 * Uses SECURITY DEFINER RPC — no client inserts into conversation_participants.
 * Never mutates, deletes, or re-keys the underlying booking; only reads status.
 */
export async function getOrCreateProviderConversation({
  userId,
  bookingRef,
  appointmentId = null,
  pharmacyOrderId = null,
  subject = null,
  metadata = {},
  providerUserId = null,
  bookingStatus = null,
  bookingRecord = null,
} = {}) {
  if (!userId) return { ok: false, error: 'Sign in to start a conversation.' }
  if (!bookingRef && !appointmentId && !pharmacyOrderId) {
    return { ok: false, error: 'Choose a booking to chat with your care provider.' }
  }

  const supabase = requireSupabase()

  // Ensure durable appointments mirror exists before chat links booking_ref.
  // Chat itself never deletes or rewrites booking status.
  let linkedAppointmentId = appointmentId
  if (!linkedAppointmentId && bookingRef) {
    const engineRecord = getBookingEngine().getById(bookingRef)
    const record = engineRecord || bookingRecord
    if (record) {
      linkedAppointmentId = await syncAppointmentRecord(record, userId)
    }
  }

  const { data, error } = await supabase.rpc('create_provider_conversation', {
    p_booking_ref: bookingRef || null,
    p_booking_status: bookingStatus || metadata?.booking_status || null,
    p_appointment_id: linkedAppointmentId || null,
    p_subject: subject || 'Care conversation',
    p_metadata: {
      ...metadata,
      ...(pharmacyOrderId ? { pharmacy_order_id: pharmacyOrderId } : {}),
    },
    p_provider_user_id: providerUserId || null,
  })

  if (error) return { ok: false, error: mapError(error) }

  const payload = data && typeof data === 'object' ? data : null
  const conversationId = payload?.conversation_id
  if (!conversationId) {
    return { ok: false, error: 'Conversation was created but no id was returned.' }
  }

  const loaded = await getConversation(conversationId)
  if (!loaded.ok) {
    return {
      ok: true,
      conversation: {
        id: conversationId,
        kind: CONVERSATION_KIND.PROVIDER,
        status: CONVERSATION_STATUS.OPEN,
        booking_ref: payload.booking_ref || bookingRef || null,
        appointment_id: payload.appointment_id || linkedAppointmentId || null,
        metadata,
      },
      conversationId,
      created: Boolean(payload.created),
    }
  }

  return {
    ok: true,
    conversation: loaded.conversation,
    conversationId,
    created: Boolean(payload.created),
  }
}

/**
 * Create a support conversation + automatic ticket ID atomically.
 * Uses RPC so ticket, conversation, participant, and first message
 * commit together (or roll back together).
 */
export async function createSupportConversation({
  userId,
  category = SUPPORT_CATEGORY.GENERAL,
  subject = null,
  body = null,
  bookingRef = null,
  appointmentId = null,
  assignedTeam = 'Care Support',
} = {}) {
  if (!userId) return { ok: false, error: 'Sign in to contact support.' }

  const text = String(body || '').trim()
  if (!text) {
    return { ok: false, error: 'Describe your issue before creating a ticket.' }
  }

  const supabase = requireSupabase()

  const { data, error } = await supabase.rpc('create_support_conversation', {
    p_category: category,
    p_body: text,
    p_subject: subject || 'Support request',
    p_booking_ref: bookingRef || null,
    p_appointment_id: appointmentId || null,
    p_assigned_team: assignedTeam,
  })

  if (error) return { ok: false, error: mapError(error) }

  const payload = data && typeof data === 'object' ? data : null
  const conversationId = payload?.conversation_id
  if (!conversationId) {
    return { ok: false, error: 'Ticket was created but no conversation id was returned.' }
  }

  const loaded = await getConversation(conversationId)
  if (!loaded.ok) {
    return {
      ok: true,
      conversation: {
        id: conversationId,
        kind: CONVERSATION_KIND.SUPPORT,
        status: CONVERSATION_STATUS.OPEN,
        support_ticket: {
          ticket_id: payload.ticket_id,
          category: payload.category || category,
          status: payload.status || SUPPORT_TICKET_STATUS.OPEN,
        },
      },
      ticket: {
        ticket_id: payload.ticket_id,
        category: payload.category || category,
        status: payload.status || SUPPORT_TICKET_STATUS.OPEN,
      },
      conversationId,
    }
  }

  return {
    ok: true,
    conversation: loaded.conversation,
    ticket: loaded.conversation.support_ticket,
    conversationId,
  }
}

export async function listMessages(conversationId, { limit = 100 } = {}) {
  if (!conversationId) return { ok: false, error: 'Missing conversation.', messages: [] }
  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      message_attachments (
        id, kind, storage_path, file_name, mime_type, size_bytes, metadata, created_at
      )
    `)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) return { ok: false, error: mapError(error), messages: [] }

  const messages = (data || []).map((row) => ({
    ...row,
    attachments: row.message_attachments || [],
    message_attachments: undefined,
  }))

  return { ok: true, messages }
}

export async function listEvents(conversationId) {
  if (!conversationId) return { ok: true, events: [] }
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('conversation_events')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) return { ok: false, error: mapError(error), events: [] }
  return { ok: true, events: data || [] }
}

export async function sendMessage({
  conversationId,
  userId,
  senderRole = PARTICIPANT_ROLE.PATIENT,
  body,
  messageType = MESSAGE_TYPE.TEXT,
  clientId = null,
  metadata = {},
} = {}) {
  if (!conversationId || !userId) {
    return { ok: false, error: 'Cannot send message.' }
  }
  const text = String(body || '').trim()
  if (!text && messageType === MESSAGE_TYPE.TEXT) {
    return { ok: false, error: 'Write a message first.' }
  }

  const supabase = requireSupabase()

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: userId,
      sender_role: senderRole,
      message_type: messageType,
      body: text || null,
      client_id: clientId,
      metadata,
    })
    .select('*')
    .single()

  if (error) return { ok: false, error: mapError(error) }
  return { ok: true, message: data }
}

export async function markRead(conversationId, userId) {
  if (!conversationId || !userId) return { ok: false }
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .is('left_at', null)

  if (error) return { ok: false, error: mapError(error) }
  return { ok: true }
}

/** Agent / patient filter helper over loaded messages + events. */
export function filterThreadItems({
  messages = [],
  events = [],
  role = null,
  messageType = null,
  mediaOnly = false,
  customerOnly = false,
  agentOnly = false,
  systemOnly = false,
} = {}) {
  let list = messages.slice()

  if (customerOnly) {
    list = list.filter((m) => m.sender_role === PARTICIPANT_ROLE.PATIENT)
  }
  if (agentOnly) {
    list = list.filter((m) => (
      m.sender_role === PARTICIPANT_ROLE.SUPPORT_AGENT
      || m.sender_role === PARTICIPANT_ROLE.PROVIDER
    ))
  }
  if (systemOnly) {
    return {
      messages: list.filter((m) => m.message_type === MESSAGE_TYPE.SYSTEM),
      events,
    }
  }
  if (role) list = list.filter((m) => m.sender_role === role)
  if (messageType) list = list.filter((m) => m.message_type === messageType)
  if (mediaOnly) {
    list = list.filter((m) => (
      m.message_type === MESSAGE_TYPE.ATTACHMENT
      || m.message_type === MESSAGE_TYPE.IMAGE
      || m.message_type === MESSAGE_TYPE.FILE
      || (m.attachments && m.attachments.length)
    ))
  }

  return { messages: list, events }
}

export async function resolveSupportTicket(conversationId, actorId) {
  const supabase = requireSupabase()
  const { error } = await supabase
    .from('support_tickets')
    .update({
      status: SUPPORT_TICKET_STATUS.RESOLVED,
      resolved_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)

  if (error) return { ok: false, error: mapError(error) }

  await supabase
    .from('conversations')
    .update({ status: CONVERSATION_STATUS.RESOLVED })
    .eq('id', conversationId)

  await insertEvent(conversationId, EVENT_TYPE.RESOLVED, actorId, {})
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: null,
    sender_role: PARTICIPANT_ROLE.SYSTEM,
    message_type: MESSAGE_TYPE.SYSTEM,
    body: 'Ticket marked resolved.',
  })

  return { ok: true }
}

export { previewFromBody }
