import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const BUCKET = "visit-attachments";

export interface UploadVisitAttachmentParams {
  userId: string;
  dealerId: string;
  visitId: string;
  file: File;
}

export type UploadVisitAttachmentResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

/**
 * Shared upload path for anything a salesman attaches to a visit from the
 * web form (photo, voice note). Storage path is scoped to the caller's own
 * uid folder to match the visit-attachments bucket's RLS policies
 * (CLAUDE.md §46, ADR-005 Revised) -- both the photo and voice note flows
 * call this instead of duplicating upload+insert logic.
 */
export async function uploadVisitAttachment(
  supabase: SupabaseClient<Database>,
  { userId, dealerId, visitId, file }: UploadVisitAttachmentParams,
): Promise<UploadVisitAttachmentResult> {
  const extension = file.name.split(".").pop() || "bin";
  const path = `${userId}/${visitId}-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined });

  if (uploadError) {
    console.error("[uploadVisitAttachment] storage upload failed", uploadError);
    return { ok: false, error: "Upload failed." };
  }

  const { error: attachmentError } = await supabase.from("attachments").insert({
    dealer_id: dealerId,
    visit_id: visitId,
    storage_bucket: BUCKET,
    file_path: path,
    file_name: file.name,
    mime_type: file.type || null,
    file_size: file.size,
    source: "web",
    created_by: userId,
  });

  if (attachmentError) {
    console.error("[uploadVisitAttachment] attachments row insert failed", attachmentError);
    return { ok: false, error: "Saved the file but failed to record it." };
  }

  return { ok: true, path };
}
