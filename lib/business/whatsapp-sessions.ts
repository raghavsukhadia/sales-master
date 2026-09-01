import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/** Inactivity window before an open session is considered stale (30 minutes). */
export const WHATSAPP_SESSION_INACTIVITY_MS = 30 * 60 * 1000;

export const WHATSAPP_SESSION_TIMEOUT_SECONDS = Math.floor(
  WHATSAPP_SESSION_INACTIVITY_MS / 1000,
);

/**
 * Assign or create a WhatsApp session for an inbound registered salesman.
 * Concurrent-safe via DB advisory lock in assign_whatsapp_session RPC.
 */
export async function assignOrCreateSession(
  supabase: SupabaseClient<Database>,
  salesmanId: string,
  messageAt: Date | string,
): Promise<string> {
  const messageAtIso =
    typeof messageAt === "string" ? messageAt : messageAt.toISOString();

  const { data, error } = await supabase.rpc("assign_whatsapp_session", {
    p_salesman_id: salesmanId,
    p_message_at: messageAtIso,
    p_timeout_seconds: WHATSAPP_SESSION_TIMEOUT_SECONDS,
  });

  if (error || !data) {
    console.error("[assignOrCreateSession] RPC failed", error);
    throw new Error(error?.message ?? "Failed to assign WhatsApp session");
  }

  return data;
}
