import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role client: bypasses RLS entirely (CLAUDE.md §51). Use only in
 * trusted server contexts that never render user-facing pages -- the
 * MessageAutoSender webhook handler and background jobs -- to write
 * whatsapp_sessions/whatsapp_messages/ai_extractions/audit_logs and to
 * create/update dealers from AI-extracted WhatsApp data on a salesman's
 * behalf (salesmen have no direct write access to dealer master data via
 * RLS; see the dealers policies in supabase/migrations).
 *
 * Never import this from a Server Component, a client-invoked Server
 * Action, or any code path that renders a page for a logged-in user --
 * doing so would let that user's request bypass every RLS policy.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
