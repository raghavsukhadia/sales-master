# WhatsApp processing foundation

This document reflects what the codebase implements today. It includes
**Phase 1 AI extraction** and **deterministic business resolution** (proposal
artifact only). It does **not** include dealer/visit/follow-up creation from
AI output, confirmation UI, or management CRM UI.

## Webhook URL and security

- **URL format:** `POST /api/webhooks/messageautosender/<MESSAGEAUTOSENDER_WEBHOOK_SECRET>`
- MessageAutoSender has no documented request signature; the path token is the shared secret.
- Wrong/missing token → **404** (endpoint appears nonexistent).
- Validated with Zod (`lib/validations/whatsapp.ts`), then stored via `ingestWhatsAppWebhookPayload`.
- Unique `(channel_id, external_message_id)` prevents duplicate rows; concurrent races return `{ received: true, duplicate: true }`.

## Webhook critical path (fast)

1. Authenticate token  
2. Parse + validate required fields  
3. Idempotent raw insert into `whatsapp_messages` (`processing_status = received`)  
4. Identify inbound (`boundType === "in"`) vs outbound  
5. Resolve salesman via **normalized** phone → `salesmen.phone_number_normalized`  
6. Assign/reuse `whatsapp_sessions` for inbound **registered** salesmen  
7. Return `{ received: true }`  
8. Optional ack `"Got it, thanks!"` via Next.js `after()` (does not block the response)

The webhook does **not** download media, run AI, resolve business actions, or create dealers/visits/follow-ups.

## Session grouping

- Table: `whatsapp_sessions`
- Constant: `WHATSAPP_SESSION_INACTIVITY_MS` = **30 minutes** (`lib/business/whatsapp-sessions.ts`)
- RPC: `assign_whatsapp_session(salesman_id, message_at, timeout_seconds)` — advisory-locked per salesman
- Behavior:
  - Reuse open session if `last_message_at` within timeout; bump `last_message_at`
  - Otherwise close stale open sessions for that salesman and create a new open session
  - Outbound messages: no session
  - Unregistered senders: message stored, `salesman_id` / `session_id` null, no ack

## Processing statuses

`whatsapp_messages.processing_status`:

| Status | Meaning |
|--------|---------|
| `received` | Stored; waiting to be claimed |
| `processing` | Claimed by worker (`FOR UPDATE SKIP LOCKED`) |
| `processed` | Worker finished (media copied if needed) |
| `failed` | Worker error; `processing_error` set; `raw_payload` retained |
| `ignored` | e.g. outbound — not salesman input |

### Retry (messages)

- `retryFailed(messageId)` in `lib/business/whatsapp-processing.ts`: only `failed` → `received`, clears error.

### Worker trigger

- `POST` / `GET` `/api/internal/process-whatsapp`
- Auth: `Authorization: Bearer <CRON_SECRET>`
- Vercel Cron: every minute (`vercel.json`)
- Steps:
  1. Claim/process messages (media copy; ignore outbound)
  2. Claim inactive/closed sessions for AI extraction (`claim_whatsapp_sessions_for_extraction`)
  3. Run extract → Zod validate → persist `whatsapp_session_extractions`
  4. On successful extraction → deterministic business resolution → persist `whatsapp_session_business_resolutions`

## Phase 1 — Session AI extraction

Pipeline:

```text
closed/inactive session
  → deterministic transcript (lib/business/whatsapp-transcript.ts)
  → OpenAI JSON extraction (lib/ai/whatsapp-extractor.ts)
  → Zod schema (lib/validations/whatsapp-extraction.ts)
  → whatsapp_session_extractions row
  → deterministic business resolution (lib/business/whatsapp-business-resolution.ts)
  → whatsapp_session_business_resolutions row (proposal only)
```

- Schema version: `1` (`WHATSAPP_EXTRACTION_SCHEMA_VERSION`)
- Prompt version: `v1` (`WHATSAPP_EXTRACTION_PROMPT_VERSION`)
- Unique per `(session_id, schema_version, prompt_version)` — retries update the same row
- Statuses: `pending` | `processing` | `succeeded` | `failed`
- Eligibility: session `closed` (stale open sessions are closed first), `salesman_id` set, ≥1 inbound message
- Media is metadata-only (no OCR/STT in this phase)
- **No** dealer / visit / follow-up mutations from AI output

### Stale processing reclaim

- Column: `whatsapp_session_extractions.processing_started_at`
- Constants: `EXTRACTION_STALE_PROCESSING_SECONDS = 900` (15 min), `MAX_EXTRACTION_ATTEMPTS = 5`
- RPC reclaim rules:
  - Fresh `processing` → **not** reclaimable
  - Stale `processing` (< max attempts) → reclaimable (`FOR UPDATE SKIP LOCKED`)
  - `succeeded` → never reclaimable
  - `failed` with `attempt_count < max` → retryable
  - `attempt_count >= max` → terminal `failed` with message `Exceeded max extraction attempts`

Env:

- `OPENAI_API_KEY`
- `WHATSAPP_EXTRACTION_MODEL` (default `gpt-4o-mini` if unset)

## Deterministic business resolution

After a **succeeded** extraction, the worker builds a proposal:

```text
validated extraction
  → resolve relative dates (Asia/Kolkata, session timestamp reference)
  → normalize phone + matchDealer (existing deterministic matcher)
  → visit / follow-up readiness (mirrors /log-visit requirements)
  → overall status
  → Zod validate
  → upsert whatsapp_session_business_resolutions
```

- Schema version: `1` / resolver version: `v1`
- Unique: `(extraction_id, schema_version, resolver_version)` — idempotent
- Overall statuses: `ready_for_confirmation` | `needs_clarification` | `not_actionable`
- `needs_clarification` / `not_actionable` are **successful** resolution outcomes (not worker failures)
- **Still no** dealer/visit/follow-up mutations

### Visit readiness (proposal)

Applicable for `visit_report` / `mixed` / `dealer_update` or `visit.occurred === true`.

Ready when:

1. Dealer uniquely matched  
2. `visit.occurred === true`  
3. Visit date deterministically resolved  

Notes/outcome are optional (same as `/log-visit`).

### Follow-up readiness (proposal)

Applicable when `followUp.requested === true`, intent is `follow_up`, or mixed with follow-up signals.

Ready when:

1. Dealer uniquely matched  
2. Reason present (maps to follow-up description)  
3. Due date deterministically resolved  

### Date resolution

- Module: `lib/business/whatsapp-date-resolution.ts`
- Timezone: **Asia/Kolkata**
- Reference: session `last_message_at` (fallback `started_at`) — not worker wall clock
- Supports: today/aaj, tomorrow, yesterday, next Monday, this Friday, ISO, DD/MM, day-month text
- Hinglish `kal` → **ambiguous** (yesterday vs tomorrow)

Evaluation fixtures (no OpenAI): `tests/fixtures/whatsapp/resolution-corpus.ts`

## WhatsApp media storage

- Bucket: **`whatsapp-media`** (private)
- Service: `lib/business/whatsapp-media.ts`
- Flow: MAS `file_path` URL → download → size/type checks (max 25MB) → upload → `attachments` row (`source = whatsapp`) → message `file_path` rewritten to owned storage path
- Original MAS URL remains inside `raw_payload`
- Media types (case-insensitive): image, audio, voice, ptt, video, document, sticker
- Web-sourced synthetic messages (`source = web`) skip remote download (already in `visit-attachments`)

## Phone normalization

- Utility: `lib/utils/phone.ts` → `normalizeIndianMobile`
- Canonical form: **`91` + 10-digit mobile** starting with 6–9 (e.g. `919876543210`)
- Accepts: `+91…`, `91…`, `0XXXXXXXXXX`, bare 10-digit, spaces/dashes/parentheses
- Invalid → `null` (never invents a number)
- Columns: `salesmen.phone_number_normalized`, `dealers.phone_number_normalized`, `dealers.whatsapp_number_normalized`
- Raw phone columns remain display source of truth; matching uses normalized columns

## Dealer matching

- Service: `lib/business/dealer-matching.ts` → `matchDealer`
- **Never auto-creates** a dealer; **never uses AI** for identity
- Priority:
  1. Exact normalized phone  
  2. Exact normalized WhatsApp  
  3. Exact GST (trim/uppercase)  
  4. Strong normalized business name + city (1 → `exact_match`; many → `possible_matches`)  
  5. Name-only → `possible_matches`
- Results: `exact_match` | `possible_matches` | `no_match`
- Business resolution maps these to: `matched` | `ambiguous` | `not_found` | `insufficient_data`

## MessageAutoSender API unknowns

**Confirmed (webhook):** `id`, `channelId`, `receiverNumber`, `senderNumber`, `boundType`, `itemType`, `value`, `time`, `caption`, `filename`, `filePath`.

**UNKNOWN:** Exact request schema for `POST /api/v1/message/create` (outbound). Current client sends `{ channelId, receiverNumber, itemType: "text", value }` with `x-api-key`. Verify against live Swagger before treating ack failures as app bugs. Full `boundType` / `itemType` enums also unconfirmed beyond observed `in` / `out` and common media type names.

## Related files

- Webhook: `app/api/webhooks/messageautosender/[token]/route.ts`
- Ingest: `lib/business/whatsapp-ingest.ts`
- Worker: `app/api/internal/process-whatsapp/route.ts`
- Extraction: `lib/business/whatsapp-extraction.ts`, `lib/ai/whatsapp-extractor.ts`
- Date resolution: `lib/business/whatsapp-date-resolution.ts`
- Business resolution: `lib/business/whatsapp-business-resolution.ts`
- Manual webhook tests: `docs/testing-messageautosender-webhook.md`
