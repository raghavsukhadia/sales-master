import { randomUUID, timingSafeEqual } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendTextMessage } from "@/lib/integrations/messageautosender/client";
import { ingestWhatsAppWebhookPayload } from "@/lib/business/whatsapp-ingest";
import { messageAutoSenderWebhookSchema } from "@/lib/validations/whatsapp";

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

const ACK_MESSAGE = "Got it, thanks!";

/**
 * Webhook critical path: authenticate → validate → store idempotently →
 * session for inbound registered salesman → return quickly.
 *
 * Does NOT: AI, media download, dealer/visit/follow-up creation.
 * Ack is scheduled via after() so it does not delay the HTTP response.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

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

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch (err) {
    console.error(
      "[messageautosender webhook] invalid JSON body",
      err,
      rawBody.slice(0, 500),
    );
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = messageAutoSenderWebhookSchema.safeParse(json);
  if (!parsed.success) {
    console.error(
      "[messageautosender webhook] payload missing required fields",
      parsed.error.flatten(),
      json,
    );
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const payload = parsed.data;
  const supabase = createServiceClient();

  try {
    const result = await ingestWhatsAppWebhookPayload(supabase, payload);

    if (result.status === "duplicate") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (result.status === "storage_failed") {
      return NextResponse.json({ error: "Storage failed" }, { status: 500 });
    }

    if (result.shouldAck) {
      const receiverNumber = payload.senderNumber;
      const externalId = payload.id;
      after(async () => {
        try {
          await sendTextMessage({ receiverNumber, text: ACK_MESSAGE });
        } catch (err) {
          console.error(
            `[messageautosender webhook] ack send failed for message id=${externalId}`,
            err,
          );
        }
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(
      `[messageautosender webhook] unexpected error, correlation=${randomUUID()}`,
      err,
      payload,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
