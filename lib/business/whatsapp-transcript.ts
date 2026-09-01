import { INBOUND_BOUND_TYPE } from "@/lib/validations/whatsapp";

export type TranscriptMessageDirection = "inbound" | "outbound";

export type WhatsAppTranscriptMedia = {
  kind: string | null;
  mimeType: string | null;
  fileName: string | null;
  /** Owned storage path or remote URL — metadata only, not file bytes. */
  filePath: string | null;
  caption: string | null;
};

export type WhatsAppTranscriptMessage = {
  id: string;
  direction: TranscriptMessageDirection;
  occurredAt: string;
  itemType: string;
  text: string | null;
  media: WhatsAppTranscriptMedia | null;
};

export type WhatsAppTranscript = {
  sessionId: string;
  salesmanId: string | null;
  startedAt: string;
  lastMessageAt: string;
  messages: WhatsAppTranscriptMessage[];
};

/** Minimal row shapes so the builder stays independent of Supabase clients (testable). */
export type TranscriptSessionInput = {
  id: string;
  salesman_id: string | null;
  started_at: string;
  last_message_at: string;
};

export type TranscriptMessageInput = {
  id: string;
  direction: string;
  message_timestamp: string;
  created_at: string;
  item_type: string;
  value: string | null;
  caption: string | null;
  file_name: string | null;
  file_path: string | null;
  mime_type?: string | null;
};

const MEDIA_KINDS = new Set([
  "image",
  "audio",
  "voice",
  "ptt",
  "video",
  "document",
  "sticker",
]);

function isMediaItemType(itemType: string): boolean {
  return MEDIA_KINDS.has(itemType.trim().toLowerCase());
}

function mapDirection(direction: string): TranscriptMessageDirection {
  return direction === INBOUND_BOUND_TYPE ? "inbound" : "outbound";
}

function buildText(message: TranscriptMessageInput): string | null {
  const parts: string[] = [];
  if (message.value?.trim()) parts.push(message.value.trim());
  // Caption on non-media items is conversational context.
  if (message.caption?.trim() && !isMediaItemType(message.item_type)) {
    parts.push(message.caption.trim());
  }
  if (parts.length === 0) return null;
  return parts.join("\n");
}

/**
 * Media is metadata-only in Phase 1. Never imply the model saw image/audio bytes.
 */
function buildMedia(message: TranscriptMessageInput): WhatsAppTranscriptMedia | null {
  const kind = message.item_type.trim().toLowerCase();
  const isMedia = isMediaItemType(kind);

  if (!isMedia && !message.file_path) {
    return null;
  }

  return {
    kind: isMedia ? kind : kind || null,
    mimeType: message.mime_type ?? null,
    fileName: message.file_name,
    filePath: message.file_path,
    caption: message.caption,
  };
}

/**
 * Deterministic chronological order: message_timestamp ASC, then created_at ASC, then id ASC.
 */
export function sortMessagesForTranscript<T extends TranscriptMessageInput>(
  messages: T[],
): T[] {
  return [...messages].sort((a, b) => {
    const t = a.message_timestamp.localeCompare(b.message_timestamp);
    if (t !== 0) return t;
    const c = a.created_at.localeCompare(b.created_at);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Build a prompt-safe transcript. Does not include raw_payload, channel secrets,
 * or processing internals.
 */
export function buildWhatsAppTranscript(
  session: TranscriptSessionInput,
  messages: TranscriptMessageInput[],
): WhatsAppTranscript {
  const ordered = sortMessagesForTranscript(messages);

  return {
    sessionId: session.id,
    salesmanId: session.salesman_id,
    startedAt: session.started_at,
    lastMessageAt: session.last_message_at,
    messages: ordered.map((message) => ({
      id: message.id,
      direction: mapDirection(message.direction),
      occurredAt: message.message_timestamp,
      itemType: message.item_type,
      text: buildText(message),
      media: buildMedia(message),
    })),
  };
}
