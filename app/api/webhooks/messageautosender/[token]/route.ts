import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTextMessage } from "@/lib/integrations/messageautosender/client";
import type { Json } from "@/types/database.types";

// MessageAutoSender's webhook has no documented signature/secret of its
// own (confirmed against their Swagger docs), so the secret lives in the
// URL path instead -- MESSAGEAUTOSENDER_WEBHOOK_SECRET, generated once,
// registered with MessageAutoSender as part of the callback URL.
function isValidToken(token: string): boolean {
  const expected = process.env.MESSAGEAUTOSENDER_WEBHOOK_SECRET;
  if (!expected) return false;

  const expectedBuf = Buffer.from(expected);
  const tokenBuf = Buffer.from(token);
  if (expectedBuf.length !== tokenBuf.length) return false;

  return timingSafeEqual(expectedBuf, tokenBuf);
}

// Confirmed from MessageAutoSender's Swagger docs (CLAUDE.md §19). Only
// "in" has been observed as a real boundType value; the full enum wasn't
// available from the collapsed Swagger dropdown, so this type is
// intentionally loose on that field -- see whatsapp_messages.direction.
interface MessageAutoSenderWebhookPayload {
  id: string;
  channelId: number;
  receiverNumber: string;
  receiverName?: string;
  senderNumber: string;
  senderName?: string;
  authorId?: string;
  authorName?: string;
  boundType: string;
  itemType: string;
  value?: string;
  time: number;
  caption?: string;
  isForwarded?: boolean;
  filename?: string;
  filePath?: string;
}

const INBOUND_BOUND_TYPE = "in";
const ACK_MESSAGE = "Got it, thanks!";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Wrong/missing token: respond like the route doesn't exist rather than
  // confirming a webhook endpoint lives here.
  if (!isValidToken(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err) {
    console.error("[messageautosender webhook] failed to read request body", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let payload: MessageAutoSenderWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("[messageautosender webhook] invalid JSON body", err, rawBody.slice(0, 500));
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.id || !payload.senderNumber || !payload.receiverNumber || !payload.boundType || !payload.itemType) {
    // Missing a field our schema requires NOT NULL for. Log the full raw
    // payload so it isn't lost even though we can't store it structurally.
    console.error("[messageautosender webhook] payload missing required fields", payload);
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const channelId = String(payload.channelId ?? "");
  const supabase = createServiceClient();

  try {
    // Idempotency pre-check (CLAUDE.md §50): fast path for the common case
    // of a genuinely new message. The DB's unique (channel_id,
    // external_message_id) constraint -- not this check -- is what
    // actually guarantees no duplicate row under concurrent deliveries;
    // see the insert's error handling below.
    const { data: existing } = await supabase
      .from("whatsapp_messages")
      .select("id")
      .eq("channel_id", channelId)
      .eq("external_message_id", payload.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    let salesmanId: string | null = null;
    if (payload.boundType === INBOUND_BOUND_TYPE) {
      const { data: salesman } = await supabase
        .from("salesmen")
        .select("id")
        .eq("phone_number", payload.senderNumber)
        .maybeSingle();
      salesmanId = salesman?.id ?? null;
    }

    // payload.time is milliseconds since epoch (confirmed sample:
    // 1686845968000 -> 2023-06-15). Passed straight to Date, not divided.
    const messageTimestamp = new Date(payload.time || Date.now()).toISOString();

    const { error: insertError } = await supabase.from("whatsapp_messages").insert({
      external_message_id: payload.id,
      channel_id: channelId,
      salesman_id: salesmanId,
      sender_number: payload.senderNumber,
      receiver_number: payload.receiverNumber,
      direction: payload.boundType,
      item_type: payload.itemType,
      value: payload.value ?? null,
      caption: payload.caption ?? null,
      file_name: payload.filename ?? null,
      file_path: payload.filePath ?? null,
      message_timestamp: messageTimestamp,
      raw_payload: payload as unknown as Json,
      processing_status: "received",
    });

    if (insertError) {
      // Unique violation = another concurrent delivery of the same
      // message won the race. That's success, not a failure.
      if (insertError.code === "23505") {
        return NextResponse.json({ received: true, duplicate: true });
      }

      // The raw insert itself failed -- the one case CLAUDE.md §49 says
      // must never happen silently. Surface it loudly and return 500 so
      // MessageAutoSender's retry mechanism gets another chance to
      // deliver it, instead of a fake 200 that guarantees permanent loss.
      console.error(
        `[messageautosender webhook] CRITICAL: raw message insert failed, data may be lost. id=${payload.id} channelId=${channelId}`,
        insertError,
        payload,
      );
      return NextResponse.json({ error: "Storage failed" }, { status: 500 });
    }

    // Best-effort acknowledgment. Failure here must not fail the webhook
    // response -- the raw message is already safely stored.
    if (payload.boundType === INBOUND_BOUND_TYPE && salesmanId) {
      try {
        await sendTextMessage({ receiverNumber: payload.senderNumber, text: ACK_MESSAGE });
      } catch (err) {
        console.error(
          `[messageautosender webhook] ack send failed for message id=${payload.id}`,
          err,
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // Unexpected failure somewhere in the flow above. If we can't tell
    // whether the raw row landed, log with the raw payload attached so
    // nothing is lost even if the DB write didn't happen.
    console.error(
      `[messageautosender webhook] unexpected error, correlation=${randomUUID()}`,
      err,
      payload,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
