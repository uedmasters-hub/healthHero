/**
 * @file src/features/conversations/index.js
 * Public surface for the Conversation Center.
 */
export * from './types'
export * from './ticket'
export * from './bookingChat'
export { resolveChatReturnTo } from './chatNav'
export {
  listInbox,
  getConversation,
  getOrCreateProviderConversation,
  createSupportConversation,
  listMessages,
  listEvents,
  sendMessage,
  markRead,
  filterThreadItems,
  resolveSupportTicket,
} from './conversationService'
export { subscribeConversation, subscribeInbox } from './realtime'
export { uploadChatAttachment, getAttachmentSignedUrl } from './attachments'
