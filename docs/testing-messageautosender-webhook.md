# Testing the MessageAutoSender webhook locally

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

```bash
# In the Supabase SQL editor, or via the MCP execute_sql tool:
select id, external_message_id, sender_number, salesman_id, item_type,
       direction, processing_status, message_timestamp
from whatsapp_messages
order by created_at desc
limit 5;
```

`salesman_id` will be `null` unless `919876543210` exists in `salesmen.phone_number`.
Insert a matching salesman first if you want to see the identification
(and the "Got it, thanks!" acknowledgment attempt) work end to end:

```sql
insert into salesmen (full_name, phone_number)
values ('Test Salesman', '919876543210');
```

(The ack send itself will fail/log an error until `MESSAGEAUTOSENDER_API_KEY`
and `MESSAGEAUTOSENDER_CHANNEL_ID` are set in `.env.local` — that's expected
and won't affect the webhook's `200` response, per §49's design.)

## 3. Re-send the exact same payload (idempotency check)

Run the step 2 curl command again, unchanged. Expect
`{"received":true,"duplicate":true}` and no second row in `whatsapp_messages`.

## 4. Send a location message

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

## 5. Confirm wrong-token requests are rejected

```bash
curl -s -o /dev/null -w "status: %{http_code}\n" \
  -X POST "http://localhost:3000/api/webhooks/messageautosender/wrong-token" \
  -H "Content-Type: application/json" -d '{}'
```

Expect `status: 404`.

## 6. Confirm outbound events are stored but don't trigger anything

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

Row should land with `direction = 'out'`, `salesman_id = null` (no lookup
is attempted for non-`"in"` events), and no acknowledgment sent.
