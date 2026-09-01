import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { extractWhatsAppSession } from "./whatsapp-extraction";
import type { WhatsAppAiExtractResult } from "@/lib/ai/whatsapp-extractor";
import { WHATSAPP_EXTRACTION_SCHEMA_VERSION } from "@/lib/validations/whatsapp-extraction";
import { WHATSAPP_EXTRACTION_PROMPT_VERSION } from "@/lib/ai/whatsapp-extractor";

type TableState = {
  extractions: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
};

function createMockSupabase(state: TableState) {
  type Filterable = { _filters?: Array<[string, unknown]> };

  const from = (table: string) => {
    const api: Filterable & {
      select: (_cols?: string) => typeof api;
      eq: (column: string, value: unknown) => typeof api;
      maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: null }>;
      single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
      update: (patch: Record<string, unknown>) => {
        eq: (column: string, value: unknown) => unknown;
      };
    } = {
      select(_cols?: string) {
        return api;
      },
      eq(column: string, value: unknown) {
        api._filters = [...(api._filters ?? []), [column, value]];
        return api;
      },
      maybeSingle: async () => {
        const filters = api._filters ?? [];
        if (table === "whatsapp_session_extractions") {
          const idFilter = filters.find(([c]) => c === "id");
          const row = state.extractions.find((e) => e.id === idFilter?.[1]);
          return { data: row ?? null, error: null };
        }
        return { data: null, error: null };
      },
      single: async () => {
        const filters = api._filters ?? [];
        if (table === "whatsapp_sessions") {
          const idFilter = filters.find(([c]) => c === "id");
          const row = state.sessions.find((s) => s.id === idFilter?.[1]);
          if (!row) return { data: null, error: { message: "not found" } };
          return { data: row, error: null };
        }
        return { data: null, error: { message: "not found" } };
      },
      update(patch: Record<string, unknown>) {
        return {
          eq(column: string, value: unknown) {
            const chain = {
              eq(column2: string, value2: unknown) {
                applyUpdate(table, [[column, value], [column2, value2]], patch, state);
                return Promise.resolve({ error: null });
              },
              then(resolve: (v: { error: null }) => void) {
                applyUpdate(table, [[column, value]], patch, state);
                resolve({ error: null });
              },
            };
            return chain;
          },
        };
      },
    };
    return api;
  };

  return { from } as unknown as SupabaseClient<Database>;
}

function applyUpdate(
  table: string,
  filters: Array<[string, unknown]>,
  patch: Record<string, unknown>,
  state: TableState,
) {
  if (table !== "whatsapp_session_extractions") return;
  for (const row of state.extractions) {
    const matches = filters.every(([col, val]) => row[col] === val);
    if (matches) Object.assign(row, patch);
  }
}

const goodExtraction = {
  schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
  conversationIntent: "visit_report" as const,
  dealer: {
    name: "Sharma Auto",
    phone: null,
    locality: null,
    city: "Indore",
    address: null,
  },
  visit: {
    occurred: true,
    dateText: "aaj",
    timeText: null,
    outcome: null,
    notes: "PPF",
  },
  followUp: {
    requested: false,
    dateText: null,
    reason: null,
  },
  products: [],
  summary: "Visit noted",
  missingFields: [],
  ambiguities: [],
  confidence: { overall: 0.7 },
};

describe("extractWhatsAppSession", () => {
  let state: TableState;

  beforeEach(() => {
    state = {
      extractions: [
        {
          id: "ext-1",
          session_id: "sess-1",
          status: "processing",
          parsed_output: null,
          schema_version: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
          prompt_version: WHATSAPP_EXTRACTION_PROMPT_VERSION,
          attempt_count: 1,
        },
      ],
      sessions: [
        {
          id: "sess-1",
          salesman_id: "sales-1",
          started_at: "2026-08-20T10:00:00.000Z",
          last_message_at: "2026-08-20T10:05:00.000Z",
        },
      ],
      messages: [
        {
          id: "m1",
          session_id: "sess-1",
          direction: "in",
          message_timestamp: "2026-08-20T10:01:00.000Z",
          created_at: "2026-08-20T10:01:00.000Z",
          item_type: "text",
          value: "Met Sharma Auto Indore",
          caption: null,
          file_name: null,
          file_path: null,
        },
      ],
    };
  });

  function supabaseWithMessages() {
    const base = createMockSupabase(state);
    return {
      from(table: string) {
        if (table === "whatsapp_messages") {
          return {
            select() {
              return {
                eq(_col: string, value: unknown) {
                  return Promise.resolve({
                    data: state.messages.filter((m) => m.session_id === value),
                    error: null,
                  });
                },
              };
            },
          };
        }
        return (base as unknown as { from: (t: string) => unknown }).from(table);
      },
    } as unknown as SupabaseClient<Database>;
  }

  it("persists successful extraction", async () => {
    const runAi = vi.fn(
      async (): Promise<WhatsAppAiExtractResult> => ({
        ok: true,
        data: goodExtraction,
        rawOutput: JSON.stringify(goodExtraction),
        model: "gpt-4o-mini",
        promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
        schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
      }),
    );

    const result = await extractWhatsAppSession(
      supabaseWithMessages(),
      "sess-1",
      "ext-1",
      { runAi },
    );

    expect(result.status).toBe("succeeded");
    expect(runAi).toHaveBeenCalledOnce();
    expect(state.extractions[0].status).toBe("succeeded");
    expect(state.extractions[0].parsed_output).toEqual(goodExtraction);
  });

  it("persists validation failure without crashing", async () => {
    const runAi = vi.fn(
      async (): Promise<WhatsAppAiExtractResult> => ({
        ok: false,
        category: "validation",
        message: "Model JSON failed Zod validation",
        rawOutput: '{"bad":true}',
        validationErrors: { fieldErrors: {}, formErrors: ["invalid"] },
        model: "gpt-4o-mini",
        promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
        schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
      }),
    );

    const result = await extractWhatsAppSession(
      supabaseWithMessages(),
      "sess-1",
      "ext-1",
      { runAi },
    );

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.category).toBe("validation");
    }
    expect(state.extractions[0].status).toBe("failed");
    expect(state.extractions[0].error_category).toBe("validation");
  });

  it("persists provider failure", async () => {
    const runAi = vi.fn(
      async (): Promise<WhatsAppAiExtractResult> => ({
        ok: false,
        category: "provider",
        message: "timeout",
        rawOutput: null,
        validationErrors: null,
        model: "gpt-4o-mini",
        promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
        schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
      }),
    );

    const result = await extractWhatsAppSession(
      supabaseWithMessages(),
      "sess-1",
      "ext-1",
      { runAi },
    );

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.category).toBe("provider");
    }
  });

  it("does not call AI again when extraction already succeeded", async () => {
    state.extractions[0].status = "succeeded";
    state.extractions[0].parsed_output = goodExtraction;

    const runAi = vi.fn(
      async (): Promise<WhatsAppAiExtractResult> => ({
        ok: true,
        data: goodExtraction,
        rawOutput: "{}",
        model: "gpt-4o-mini",
        promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
        schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
      }),
    );

    const result = await extractWhatsAppSession(
      supabaseWithMessages(),
      "sess-1",
      "ext-1",
      { runAi },
    );

    expect(result.status).toBe("succeeded");
    if (result.status === "succeeded") {
      expect(result.skippedAi).toBe(true);
    }
    expect(runAi).not.toHaveBeenCalled();
  });
});
