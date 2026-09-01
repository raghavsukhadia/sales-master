import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { WhatsAppMessageRow } from "@/lib/business/whatsapp-processing";

export const WHATSAPP_MEDIA_BUCKET = "whatsapp-media";
export const WHATSAPP_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

/** Case-insensitive MessageAutoSender item types that carry downloadable media. */
const MEDIA_ITEM_TYPES = new Set([
  "image",
  "audio",
  "voice",
  "ptt",
  "video",
  "document",
  "sticker",
]);

export function isMediaItemType(itemType: string): boolean {
  return MEDIA_ITEM_TYPES.has(itemType.trim().toLowerCase());
}

export function shouldCopyWhatsAppMedia(message: WhatsAppMessageRow): boolean {
  if (!message.file_path) return false;
  // Already copied into our bucket (path is not an http(s) URL).
  if (!/^https?:\/\//i.test(message.file_path)) return false;
  return isMediaItemType(message.item_type);
}

export type CopyWhatsAppMediaResult =
  | { ok: true; storagePath: string }
  | { ok: false; error: string };

/**
 * Download media from MessageAutoSender URL into owned Supabase Storage.
 * Original URL remains in raw_payload; file_path is updated to the owned path.
 */
export async function copyWhatsAppMediaToStorage(
  supabase: SupabaseClient<Database>,
  message: WhatsAppMessageRow,
): Promise<CopyWhatsAppMediaResult> {
  if (!message.file_path || !/^https?:\/\//i.test(message.file_path)) {
    return { ok: false, error: "No remote media URL to copy." };
  }

  let response: Response;
  try {
    response = await fetch(message.file_path, {
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    return { ok: false, error: `Media download failed: ${msg}` };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `Media download HTTP ${response.status}`,
    };
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > WHATSAPP_MEDIA_MAX_BYTES) {
    return {
      ok: false,
      error: `Media exceeds max size (${WHATSAPP_MEDIA_MAX_BYTES} bytes)`,
    };
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > WHATSAPP_MEDIA_MAX_BYTES) {
    return {
      ok: false,
      error: `Media exceeds max size (${WHATSAPP_MEDIA_MAX_BYTES} bytes)`,
    };
  }

  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    guessMimeFromFileName(message.file_name) ||
    "application/octet-stream";

  const safeName = sanitizeFileName(message.file_name || `media-${message.id}`);
  const ownerFolder = message.salesman_id ?? "unknown";
  const storagePath = `${ownerFolder}/${message.id}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(WHATSAPP_MEDIA_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error("[copyWhatsAppMediaToStorage] upload failed", uploadError);
    return { ok: false, error: `Storage upload failed: ${uploadError.message}` };
  }

  const { error: attachmentError } = await supabase.from("attachments").insert({
    whatsapp_message_id: message.id,
    storage_bucket: WHATSAPP_MEDIA_BUCKET,
    file_path: storagePath,
    file_name: message.file_name,
    mime_type: mimeType,
    file_size: arrayBuffer.byteLength,
    source: "whatsapp",
  });

  if (attachmentError) {
    console.error("[copyWhatsAppMediaToStorage] attachments insert failed", attachmentError);
    return {
      ok: false,
      error: `Attachment metadata insert failed: ${attachmentError.message}`,
    };
  }

  // Keep the original MAS URL only inside raw_payload; point file_path at owned storage.
  const { error: updateError } = await supabase
    .from("whatsapp_messages")
    .update({ file_path: storagePath })
    .eq("id", message.id);

  if (updateError) {
    console.error("[copyWhatsAppMediaToStorage] message path update failed", updateError);
    return {
      ok: false,
      error: `Failed to update message file_path: ${updateError.message}`,
    };
  }

  return { ok: true, storagePath };
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() || "file";
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "file";
}

function guessMimeFromFileName(fileName: string | null): string | null {
  if (!fileName) return null;
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "mp3":
      return "audio/mpeg";
    case "ogg":
    case "oga":
      return "audio/ogg";
    case "pdf":
      return "application/pdf";
    default:
      return null;
  }
}
