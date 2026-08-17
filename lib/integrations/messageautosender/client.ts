import "server-only";

/**
 * Outgoing MessageAutoSender API (CLAUDE.md §34). Server-only: the
 * `server-only` import makes it a build error to pull this into any
 * client bundle, so the API key can never reach the browser.
 *
 * NOTE: the request body shape below (channelId/receiverNumber/itemType/
 * value) is inferred from symmetry with the confirmed webhook payload
 * schema (CLAUDE.md §19), not confirmed against MessageAutoSender's
 * Swagger docs for POST /api/v1/message/create specifically -- that
 * endpoint's exact schema is still an open question (see summary).
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
