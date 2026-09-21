# Conversation Center

Persistent provider and support messaging for eMedicalls. In-visit telehealth chat stays on `telehealth_messages` and is **not** merged into this system.

Concepts (message kinds, inbox/thread mental model) are adapted from Tabcom’s client model. Tabcom’s zero-retention Socket.IO relay, presence masking, and collaboration boards are **not** used — messages live in Postgres with Supabase Realtime and Storage.

## Booking SSOT

Treat, Ready for Visit, Home carousel, Notifications deep-links, and provider chat all read bookings from the same **AppointmentRepository** (`src/booking` engine). Provider conversations store `booking_ref` (= local booking id) and optionally `appointment_id` (Postgres mirror). Creating chat never deletes or re-keys a booking — it only upserts the durable `appointments` row so refresh can restore the visit if local storage is cleared.

## Schema

| Table | Role |
| --- | --- |
| `conversations` | One row per booking (`provider`) or ticket (`support`) |
| `support_tickets` | Required for support; unique `ticket_id` + `conversation_id` |
| `conversation_participants` | Patient / provider / support_agent membership |
| `messages` | Thread body (`text`, `system`, `attachment`, …) |
| `message_attachments` | Typed files in Storage |
| `conversation_events` | Timeline (`created`, `assigned`, `resolved`, …) — not chat bubbles |

### Conversation kinds

- **`provider`** — permanent link via `booking_ref` (local booking-engine id) plus optional `appointment_id` / `pharmacy_order_id`.
- **`support`** — always has a ticket; optional booking link.

Agent join/leave only changes participants; history never splits.

### Ticket IDs

`public.next_support_ticket_id()` → `SUP-YYMM-######` (UTC year-month + sequence).

Example: `SUP-2609-001245`.

## Client module

`src/features/conversations/`

- `conversationService.js` — inbox, get/create provider & support threads, send, mark read, resolve, `filterThreadItems`
- `realtime.js` — subscribe to messages / events / conversation row
- `attachments.js` — upload to `chat-attachments` + signed URLs
- Pages: `/chat`, `/chat/new`, `/chat/:conversationId`, `/chat/agent` (staff/admin stub)

## Routes & entry points

| Path | Audience |
| --- | --- |
| `/chat` | Patient inbox |
| `/chat/new` | Start provider chat or support ticket |
| `/chat/:id` | Provider (or legacy) thread |
| `/chat/support/:id` | Support ticket thread |
| `/chat/agent` | Staff/admin ticket filter stub |

## Provider chat

Eligible when booking status is `checked_in`, `in_progress` / `consultation_active`, or `completed` (`isProviderChatEnabled`).

Creation uses SECURITY DEFINER RPC `create_provider_conversation` (validates ownership + eligibility, reuses or creates conversation + patient participant, optional provider participant). Clients never insert into `conversation_participants` directly.

- Ready for Visit: chat icon on the doctor card only while chat-enabled.
- FAB → Chat → New → Provider: eligible bookings with labels like “Checked in”.
- Thread reuses Conversation Center messages + Realtime; context card shows appointment, doctor, status, and healthcare actions.


FAB Live Chat and pharmacy support CTAs navigate to `/chat`. FAB is hidden and notification toasts are quiet on `/chat*`.

## RLS (summary)

- Patients see conversations they participate in, or that they created (`created_by`).
- Doctors/staff via participation or linked appointment/order helpers.
- Support agents (`staff` / `admin`) via `is_support_agent()` for support conversations.
- No cross-patient leakage: access is participation- or role-gated.
- Creator SELECT is required so PostgREST `.insert().select()` (RETURNING) works before the first participant row exists.

Storage path: `{conversation_id}/{message_id}/{filename}` in bucket `chat-attachments`.

## Supabase dashboard checklist

After applying `supabase/migrations/20260920200000_conversations.sql`:

1. **Realtime** — confirm `messages`, `conversation_events`, and `conversations` are in the `supabase_realtime` publication (migration adds them).
2. **Storage** — confirm bucket `chat-attachments` exists (private) and policies match the migration.
3. **RPC** — `next_support_ticket_id` callable by authenticated clients for ticket creation.

## Out of scope (Phase 1)

Full agent console polish, voice-note recording, migrating telehealth in-session chat into Conversation Center.
