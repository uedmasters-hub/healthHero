import ConversationThreadPage from './ConversationThreadPage'

/** Dedicated support chat thread at /chat/support/:conversationId */
export default function SupportThreadPage() {
  return <ConversationThreadPage supportRoute />
}
