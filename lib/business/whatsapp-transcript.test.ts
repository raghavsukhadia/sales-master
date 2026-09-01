import { describe, expect, it } from "vitest";
import {
  buildWhatsAppTranscript,
  sortMessagesForTranscript,
  type TranscriptMessageInput,
  type TranscriptSessionInput,
} from "./whatsapp-transcript";

const session: TranscriptSessionInput = {
  id: "sess-1",
  salesman_id: "sales-1",
  started_at: "2026-08-20T10:00:00.000Z",
  last_message_at: "2026-08-20T10:05:00.000Z",
};

function msg(
  overrides: Partial<TranscriptMessageInput> & Pick<TranscriptMessageInput, "id">,
): TranscriptMessageInput {
  return {
    direction: "in",
    message_timestamp: "2026-08-20T10:01:00.000Z",
    created_at: "2026-08-20T10:01:00.000Z",
    item_type: "text",
    value: "hello",
    caption: null,
    file_name: null,
    file_path: null,
    ...overrides,
  };
}

describe("sortMessagesForTranscript", () => {
  it("orders chronologically by message_timestamp", () => {
    const ordered = sortMessagesForTranscript([
      msg({ id: "b", message_timestamp: "2026-08-20T10:02:00.000Z" }),
      msg({ id: "a", message_timestamp: "2026-08-20T10:01:00.000Z" }),
    ]);
    expect(ordered.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("uses created_at then id as stable tie-breakers", () => {
    const ordered = sortMessagesForTranscript([
      msg({
        id: "z",
        message_timestamp: "2026-08-20T10:01:00.000Z",
        created_at: "2026-08-20T10:01:02.000Z",
      }),
      msg({
        id: "a",
        message_timestamp: "2026-08-20T10:01:00.000Z",
        created_at: "2026-08-20T10:01:01.000Z",
      }),
      msg({
        id: "b",
        message_timestamp: "2026-08-20T10:01:00.000Z",
        created_at: "2026-08-20T10:01:01.000Z",
      }),
    ]);
    expect(ordered.map((m) => m.id)).toEqual(["a", "b", "z"]);
  });
});

describe("buildWhatsAppTranscript", () => {
  it("maps inbound/outbound and text-only messages", () => {
    const transcript = buildWhatsAppTranscript(session, [
      msg({ id: "1", direction: "in", value: "Met Sharma Auto" }),
      msg({ id: "2", direction: "out", value: "Got it, thanks!" }),
    ]);
    expect(transcript.messages[0].direction).toBe("inbound");
    expect(transcript.messages[1].direction).toBe("outbound");
    expect(transcript.messages[0].text).toBe("Met Sharma Auto");
    expect(transcript.messages[0].media).toBeNull();
  });

  it("represents media-only messages as metadata without inventing content", () => {
    const transcript = buildWhatsAppTranscript(session, [
      msg({
        id: "img",
        item_type: "image",
        value: null,
        caption: "visiting card",
        file_name: "card.jpg",
        file_path: "sales-1/msg/card.jpg",
      }),
    ]);
    expect(transcript.messages[0].text).toBeNull();
    expect(transcript.messages[0].media).toEqual({
      kind: "image",
      mimeType: null,
      fileName: "card.jpg",
      filePath: "sales-1/msg/card.jpg",
      caption: "visiting card",
    });
  });

  it("tolerates unsupported item types without crashing", () => {
    const transcript = buildWhatsAppTranscript(session, [
      msg({ id: "x", item_type: "unknown_widget", value: null }),
    ]);
    expect(transcript.messages).toHaveLength(1);
    expect(transcript.messages[0].itemType).toBe("unknown_widget");
    expect(transcript.messages[0].media).toBeNull();
  });

  it("does not leak raw_payload or processing fields into the transcript", () => {
    const transcript = buildWhatsAppTranscript(session, [
      msg({ id: "1", value: "hi" }),
    ]);
    const serialized = JSON.stringify(transcript);
    expect(serialized).not.toContain("raw_payload");
    expect(serialized).not.toContain("processing_status");
    expect(serialized).not.toContain("processing_error");
    expect(transcript).toEqual({
      sessionId: "sess-1",
      salesmanId: "sales-1",
      startedAt: session.started_at,
      lastMessageAt: session.last_message_at,
      messages: [
        {
          id: "1",
          direction: "inbound",
          occurredAt: "2026-08-20T10:01:00.000Z",
          itemType: "text",
          text: "hi",
          media: null,
        },
      ],
    });
  });
});
