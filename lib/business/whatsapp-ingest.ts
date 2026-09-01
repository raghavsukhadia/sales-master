import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { normalizeIndianMobile } from "@/lib/utils/phone";
import { assignOrCreateSession } from "@/lib/business/whatsapp-sessions";
import {
  INBOUND_BOUND_TYPE,
  type MessageAutoSenderWebhookPayload,
} from "@/lib/validations/whatsapp";

export type IngestResult =
  | { status: "stored"; messageId: string; salesmanId: string | null; sessionId: string | null; shouldAck: boolean }
  | { status: "duplicate" }
  | { status: "storage_failed"; error: string };

/**
 * Persist a validated MAS webhook payload: idempotent insert, salesman
 * resolution via normalized phone, session assign for inbound registered
 * salesmen. Does not download media, run AI, or create dealers/visits.
 */
export async function ingestWhatsAppWebhookPayload(
  supabase: SupabaseClient<Database>,
  payload: MessageAutoSenderWebhookPayload,
): Promise<IngestResult> {
  const channelId = String(payload.channelId ?? "");

  const { data: existing } = await supabase
    .from("whatsapp_messages")
    .select("id")
    .eq("channel_id", channelId)
    .eq("external_message_id", payload.id)
    .maybeSingle();

  if (existing) {
    return { status: "duplicate" };
  }

  const isInbound = payload.boundType === INBOUND_BOUND_TYPE;

  let salesmanId: string | null = null;
  if (isInbound) {
    salesmanId = await resolveSalesmanIdBySenderNumber(supabase, payload.senderNumber);
  }

  const messageTimestamp = new Date(payload.time || Date.now()).toISOString();

  let sessionId: string | null = null;
  if (isInbound && salesmanId) {
    try {
      sessionId = await assignOrCreateSession(supabase, salesmanId, messageTimestamp);
    } catch (err) {
      // Session failure must not drop the raw message — store without session.
      console.error("[ingestWhatsAppWebhookPayload] session assign failed", err);
      sessionId = null;
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      external_message_id: payload.id,
      channel_id: channelId,
      session_id: sessionId,
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
      source: "whatsapp",
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { status: "duplicate" };
    }
    console.error(
      `[ingestWhatsAppWebhookPayload] CRITICAL: raw message insert failed id=${payload.id} channelId=${channelId}`,
      insertError,
      payload,
    );
    return { status: "storage_failed", error: insertError.message };
  }

  return {
    status: "stored",
    messageId: inserted.id,
    salesmanId,
    sessionId,
    shouldAck: isInbound && Boolean(salesmanId),
  };
}

export async function resolveSalesmanIdBySenderNumber(
  supabase: SupabaseClient<Database>,
  senderNumber: string,
): Promise<string | null> {
  const normalized = normalizeIndianMobile(senderNumber);
  if (!normalized) {
    return null;
  }

  const { data, error } = await supabase
    .from("salesmen")
    .select("id")
    .eq("phone_number_normalized", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[resolveSalesmanIdBySenderNumber] query failed", error);
    return null;
  }

  return data?.id ?? null;
}
