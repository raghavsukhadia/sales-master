import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type WhatsAppMessageRow = Database["public"]["Tables"]["whatsapp_messages"]["Row"];

const DEFAULT_BATCH = 10;

export async function claimNextMessages(
  supabase: SupabaseClient<Database>,
  limit: number = DEFAULT_BATCH,
): Promise<WhatsAppMessageRow[]> {
  const { data, error } = await supabase.rpc("claim_whatsapp_messages", {
    batch_size: limit,
  });

  if (error) {
    console.error("[claimNextMessages] RPC failed", error);
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function markProcessed(
  supabase: SupabaseClient<Database>,
  messageId: string,
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_messages")
    .update({
      processing_status: "processed",
      processing_error: null,
    })
    .eq("id", messageId)
    .eq("processing_status", "processing");

  if (error) {
    console.error("[markProcessed] update failed", error);
    throw new Error(error.message);
  }
}

export async function markFailed(
  supabase: SupabaseClient<Database>,
  messageId: string,
  processingError: string,
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_messages")
    .update({
      processing_status: "failed",
      processing_error: processingError.slice(0, 4000),
    })
    .eq("id", messageId);

  if (error) {
    console.error("[markFailed] update failed", error);
    throw new Error(error.message);
  }
}

export async function markIgnored(
  supabase: SupabaseClient<Database>,
  messageId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_messages")
    .update({
      processing_status: "ignored",
      processing_error: reason.slice(0, 4000),
    })
    .eq("id", messageId);

  if (error) {
    console.error("[markIgnored] update failed", error);
    throw new Error(error.message);
  }
}

/**
 * Reset a failed message to received so it can be claimed again.
 * Does not touch raw_payload.
 */
export async function retryFailed(
  supabase: SupabaseClient<Database>,
  messageId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .update({
      processing_status: "received",
      processing_error: null,
    })
    .eq("id", messageId)
    .eq("processing_status", "failed")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[retryFailed] update failed", error);
    throw new Error(error.message);
  }

  return Boolean(data);
}
