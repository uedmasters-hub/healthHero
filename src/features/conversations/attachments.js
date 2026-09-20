/**
 * Chat attachment uploads via Supabase Storage (signed URLs).
 */
import { requireSupabase } from '../../lib/supabase'
import { ATTACHMENT_KIND, MESSAGE_TYPE, PARTICIPANT_ROLE } from './types'
import { sendMessage } from './conversationService'

function inferKind(mimeType = '', fileName = '') {
  const mime = String(mimeType).toLowerCase()
  const name = String(fileName).toLowerCase()
  if (mime.startsWith('image/')) return ATTACHMENT_KIND.MEDICAL_IMAGE
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return ATTACHMENT_KIND.PDF
  if (mime.startsWith('audio/')) return ATTACHMENT_KIND.VOICE_NOTE
  if (/prescription|rx/.test(name)) return ATTACHMENT_KIND.PRESCRIPTION
  if (/lab|report/.test(name)) return ATTACHMENT_KIND.LAB_REPORT
  if (/invoice|bill/.test(name)) return ATTACHMENT_KIND.INVOICE
  return ATTACHMENT_KIND.OTHER
}

/**
 * Upload a file into chat-attachments/{conversationId}/{messageId}/{filename}
 * and attach it to a new message.
 */
export async function uploadChatAttachment({
  conversationId,
  userId,
  senderRole = PARTICIPANT_ROLE.PATIENT,
  file,
  kind = null,
  caption = '',
} = {}) {
  if (!conversationId || !userId || !file) {
    return { ok: false, error: 'Missing attachment details.' }
  }

  const supabase = requireSupabase()
  const attachmentKind = kind || inferKind(file.type, file.name)
  const messageType = file.type?.startsWith('image/')
    ? MESSAGE_TYPE.IMAGE
    : MESSAGE_TYPE.ATTACHMENT

  const send = await sendMessage({
    conversationId,
    userId,
    senderRole,
    body: caption || file.name || 'Attachment',
    messageType,
    metadata: { has_attachment: true },
  })
  if (!send.ok) return send

  const messageId = send.message.id
  const safeName = String(file.name || 'file').replace(/[^\w.\-]+/g, '_')
  const path = `${conversationId}/${messageId}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (uploadError) {
    return { ok: false, error: uploadError.message || 'Upload failed.' }
  }

  const { data: attachment, error: rowError } = await supabase
    .from('message_attachments')
    .insert({
      message_id: messageId,
      kind: attachmentKind,
      storage_path: path,
      file_name: file.name || safeName,
      mime_type: file.type || null,
      size_bytes: file.size || null,
    })
    .select('*')
    .single()

  if (rowError) return { ok: false, error: rowError.message }

  return {
    ok: true,
    message: send.message,
    attachment,
  }
}

export async function getAttachmentSignedUrl(storagePath, expiresIn = 3600) {
  if (!storagePath) return { ok: false, error: 'Missing path.' }
  const supabase = requireSupabase()
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(storagePath, expiresIn)

  if (error) return { ok: false, error: error.message }
  return { ok: true, url: data?.signedUrl || null }
}
