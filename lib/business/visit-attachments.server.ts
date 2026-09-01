import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { VisitAttachment } from "@/lib/types/visit-history";
import {
  createAttachmentSignedUrls,
  listVisitImageAttachments,
} from "@/lib/business/attachments";

export async function loadVisitImageAttachments(
  supabase: SupabaseClient<Database>,
  visitId: string,
): Promise<VisitAttachment[]> {
  const rows = await listVisitImageAttachments(supabase, visitId);
  return createAttachmentSignedUrls(supabase, rows);
}
