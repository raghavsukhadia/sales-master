# Testing the MessageAutoSender webhook locally

See also [whatsapp-processing.md](./whatsapp-processing.md) for session grouping,
processing statuses, media copy, and phone normalization.

The webhook URL is `/api/webhooks/messageautosender/<MESSAGEAUTOSENDER_WEBHOOK_SECRET>`
— the secret is the auth mechanism (MessageAutoSender's webhook has no
documented signature of its own), so it must be in the URL you register
with them, and in every test request below.

## 1. Start the dev server

```bash
npm run dev
```

## 2. Send a sample inbound text message

This mirrors the confirmed real sample payload from MessageAutoSender's
docs. Run from the project root (reads the secret straight out of
`.env.local` so it's always current):

```bash
SECRET=$(grep '^MESSAGEAUTOSENDER_WEBHOOK_SECRET=' .env.local | cut -d= -f2-)

curl -s -X POST "http://localhost:3000/api/webhooks/messageautosender/$SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "false_16608413030@c.us_TESTID001",
    "channelId": 1442,
    "receiverNumber": "919999976084",
    "receiverName": "You",
    "senderNumber": "919876543210",
    "senderName": "you",
    "boundType": "in",
    "itemType": "text",
    "value": "hey bro",
    "time": 1686845968000,
    "isForwarded": false
  }'
```

Expect `{"received":true}`. Check the row landed:

```sql
select id, external_message_id, sender_number, salesman_id, session_id, item_type,
       direction, processing_status, message_timestamp
from whatsapp_messages
order by created_at desc
limit 5;
```

`salesman_id` / `session_id` will be null unless a salesman exists with
`phone_number_normalized` matching the normalized form of `919876543210`
(canonical `91` + 10 digits). Insert/link a salesman first:

```sql
insert into salesmen (full_name, phone_number, phone_number_normalized)
values (
  'Test Salesman',
  '919876543210',
  public.normalize_indian_mobile('919876543210')
);
```

(The ack send runs in `after()` and may fail/log until
`MESSAGEAUTOSENDER_API_KEY` and `MESSAGEAUTOSENDER_CHANNEL_ID` are set —
that does not affect the webhook's `200` response.)

## 3. Re-send the exact same payload (idempotency check)

Run the step 2 curl command again, unchanged. Expect
`{"received":true,"duplicate":true}` and no second row in `whatsapp_messages`.

## 4. Session grouping check

Send a second inbound message with a **new** `id` from the same salesman
within 30 minutes. Expect the same `session_id` on both rows.

## 5. Send a location message

```bash
curl -s -X POST "http://localhost:3000/api/webhooks/messageautosender/$SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "false_16608413030@c.us_TESTID002",
    "channelId": 1442,
    "receiverNumber": "919999976084",
    "senderNumber": "919876543210",
    "boundType": "in",
    "itemType": "location",
    "value": "19.08252,72.74075",
    "caption": "Sharma Auto, Indore",
    "time": 1686845968000,
    "isForwarded": false
  }'
```

## 6. Confirm wrong-token requests are rejected

```bash
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "http://localhost:3000/api/webhooks/messageautosender/wrong-token" \
  -H "Content-Type: application/json" -d '{}'
```

Expect `status: 404`.

## 7. Confirm outbound events are stored but don't create sessions

```bash
curl -s -X POST "http://localhost:3000/api/webhooks/messageautosender/$SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "false_16608413030@c.us_TESTID003",
    "channelId": 1442,
    "receiverNumber": "919876543210",
    "receiverName": "you",
    "senderNumber": "919999976084",
    "senderName": "You",
    "boundType": "out",
    "itemType": "text",
    "value": "Got it, thanks!",
    "time": 1686845968000,
    "isForwarded": false
  }'
```

Row should land with `direction = 'out'`, `salesman_id` / `session_id` null,
and no acknowledgment scheduled.

## 8. Run the async worker (media + status machine + extraction)

```bash
curl -s -X POST "http://localhost:3000/api/internal/process-whatsapp" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"batchSize":10,"extractionBatchSize":5}'
```

Expect JSON like `{ "ok": true, "claimed": N, "processed": …, "ignored": …, "failed": …, "extractionsClaimed": …, "extractionsSucceeded": … }`.
Outbound rows should become `ignored`. Text/location become `processed`.
Media with an `https` `file_path` is copied into the `whatsapp-media` bucket.

Sessions inactive for 30+ minutes (or already `closed`) with inbound messages are claimed for AI extraction into `whatsapp_session_extractions` (requires `OPENAI_API_KEY`). Re-running the worker does not create a second successful extraction for the same schema/prompt version.
