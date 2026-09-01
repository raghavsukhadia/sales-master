import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { AttachmentStorageRow } from "./attachments";

const mockOrder = vi.fn();
const mockLike = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockStorageFrom = vi.fn();

function buildSupabaseMock() {
  mockOrder.mockReturnValue({ data: [], error: null });
  mockLike.mockReturnValue({ order: mockOrder });
  mockEq.mockReturnValue({ like: mockLike });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
  mockStorageFrom.mockReturnValue({ createSignedUrl: mockCreateSignedUrl });

  return {
    from: mockFrom,
    storage: { from: mockStorageFrom },
  } as unknown as SupabaseClient<Database>;
}

describe("listVisitImageAttachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries image attachments for a visit ordered by created_at", async () => {
    const rows: AttachmentStorageRow[] = [
      {
        id: "att-1",
        storage_bucket: "visit-attachments",
        file_path: "user/visit-1.jpg",
        file_name: "card.jpg",
        mime_type: "image/jpeg",
      },
    ];

    const { listVisitImageAttachments } = await import("./attachments");
    const supabase = buildSupabaseMock();
    mockOrder.mockReturnValue({ data: rows, error: null });
    const result = await listVisitImageAttachments(supabase, "visit-123");

    expect(mockFrom).toHaveBeenCalledWith("attachments");
    expect(mockSelect).toHaveBeenCalledWith(
      "id, storage_bucket, file_path, file_name, mime_type",
    );
    expect(mockEq).toHaveBeenCalledWith("visit_id", "visit-123");
    expect(mockLike).toHaveBeenCalledWith("mime_type", "image/%");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("returns an empty array when the query fails", async () => {
    const { listVisitImageAttachments } = await import("./attachments");
    const supabase = buildSupabaseMock();
    mockOrder.mockReturnValue({ data: null, error: { message: "query failed" } });
    const result = await listVisitImageAttachments(supabase, "visit-123");

    expect(result).toEqual([]);
  });
});

describe("createAttachmentSignedUrls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps attachment rows to signed URLs", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed.jpg" },
      error: null,
    });

    const rows: AttachmentStorageRow[] = [
      {
        id: "att-1",
        storage_bucket: "visit-attachments",
        file_path: "user/visit-1.jpg",
        file_name: "card.jpg",
        mime_type: "image/jpeg",
      },
    ];

    const { createAttachmentSignedUrls } = await import("./attachments");
    const supabase = buildSupabaseMock();
    const result = await createAttachmentSignedUrls(supabase, rows, 3600);

    expect(mockStorageFrom).toHaveBeenCalledWith("visit-attachments");
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("user/visit-1.jpg", 3600);
    expect(result).toEqual([
      {
        id: "att-1",
        fileName: "card.jpg",
        mimeType: "image/jpeg",
        url: "https://example.com/signed.jpg",
      },
    ]);
  });

  it("skips rows that fail to sign and keeps successful ones", async () => {
    mockCreateSignedUrl
      .mockResolvedValueOnce({ data: null, error: { message: "failed" } })
      .mockResolvedValueOnce({
        data: { signedUrl: "https://example.com/card-2.jpg" },
        error: null,
      });

    const rows: AttachmentStorageRow[] = [
      {
        id: "att-1",
        storage_bucket: "visit-attachments",
        file_path: "user/visit-1.jpg",
        file_name: "card-1.jpg",
        mime_type: "image/jpeg",
      },
      {
        id: "att-2",
        storage_bucket: "visit-attachments",
        file_path: "user/visit-2.jpg",
        file_name: "card-2.jpg",
        mime_type: "image/jpeg",
      },
    ];

    const { createAttachmentSignedUrls } = await import("./attachments");
    const supabase = buildSupabaseMock();
    const result = await createAttachmentSignedUrls(supabase, rows);

    expect(result).toEqual([
      {
        id: "att-2",
        fileName: "card-2.jpg",
        mimeType: "image/jpeg",
        url: "https://example.com/card-2.jpg",
      },
    ]);
  });
});
