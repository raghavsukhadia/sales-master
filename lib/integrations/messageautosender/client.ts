import "server-only";

/**
 * Outgoing MessageAutoSender API (CLAUDE.md §34). Server-only: the
 * `server-only` import makes it a build error to pull this into any
 * client bundle, so the API key can never reach the browser.
 *
 * CONFIRMED (webhook ingest): id, channelId, receiverNumber, senderNumber,
 * boundType, itemType, value, time, caption, filename, filePath.
 *
 * UNKNOWN — POST /api/v1/message/create request schema was not available
 * from MessageAutoSender Swagger in-repo. The body below
 * (channelId / receiverNumber / itemType / value) is inferred from
 * webhook field symmetry and must be verified against live docs before
 * treating ack failures as application bugs. Auth header x-api-key is
 * likewise inferred from common MAS patterns and is UNKNOWN until confirmed.
 */

interface SendTextMessageParams {
  receiverNumber: string;
  text: string;
}

function getConfig() {
  const baseUrl = process.env.MESSAGEAUTOSENDER_BASE_URL;
  const apiKey = process.env.MESSAGEAUTOSENDER_API_KEY;
  const channelId = process.env.MESSAGEAUTOSENDER_CHANNEL_ID;

  if (!baseUrl || !apiKey || !channelId) {
    throw new Error(
      "MessageAutoSender is not configured: MESSAGEAUTOSENDER_BASE_URL/API_KEY/CHANNEL_ID must all be set.",
    );
  }

  return { baseUrl, apiKey, channelId };
}

export async function sendTextMessage({ receiverNumber, text }: SendTextMessageParams): Promise<void> {
  const { baseUrl, apiKey, channelId } = getConfig();

  const response = await fetch(`${baseUrl}/api/v1/message/create`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      channelId: Number(channelId),
      receiverNumber,
      itemType: "text",
      value: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`MessageAutoSender send failed (${response.status}): ${body}`);
  }
}
