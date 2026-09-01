import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { WHATSAPP_EXTRACTION_SCHEMA_VERSION } from "@/lib/validations/whatsapp-extraction";
import {
  WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION,
  WHATSAPP_BUSINESS_RESOLVER_VERSION,
} from "@/lib/validations/whatsapp-business-resolution";
import {
  classifyDealerIdentity,
  computeFollowUpReadiness,
  computeOverallStatus,
  computeVisitReadiness,
  resolveWhatsAppExtraction,
} from "./whatsapp-business-resolution";

vi.mock("@/lib/business/dealer-matching", () => ({
  matchDealer: vi.fn(),
}));

import { matchDealer } from "@/lib/business/dealer-matching";

const matchDealerMock = vi.mocked(matchDealer);

const EXTRACTION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DEALER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const DEALER_ID_2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const RESOLUTION_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

function baseExtraction(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
    conversationIntent: "mixed",
    dealer: {
      name: "Gupta Electricals",
      phone: null,
      locality: null,
      city: null,
      address: null,
    },
    visit: {
      occurred: true,
      dateText: "today",
      timeText: null,
      outcome: "Interested in 50 switches",
      notes: null,
    },
    followUp: {
      requested: true,
      dateText: "next Monday",
      reason: "Discuss order",
    },
    products: [],
    summary: "Visited Gupta Electricals; follow up next Monday.",
    missingFields: [],
    ambiguities: [],
    confidence: { overall: 0.9 },
    ...overrides,
  };
}

type State = {
  extractions: Array<Record<string, unknown>>;
  sessions: Array<Record<string, unknown>>;
  resolutions: Array<Record<string, unknown>>;
};

function createMockSupabase(state: State) {
  type Filterable = { _filters?: Array<[string, unknown]> };

  const from = (table: string) => {
    const api: Filterable & Record<string, unknown> = {
      select() {
        return api;
      },
      eq(column: string, value: unknown) {
        api._filters = [...((api._filters as Array<[string, unknown]>) ?? []), [column, value]];
        return api;
      },
      maybeSingle: async () => {
        const filters = (api._filters as Array<[string, unknown]>) ?? [];
        if (table === "whatsapp_session_business_resolutions") {
          const extractionFilter = filters.find(([c]) => c === "extraction_id");
          const row = state.resolutions.find(
            (r) => r.extraction_id === extractionFilter?.[1],
          );
          return { data: row ?? null, error: null };
        }
        if (table === "whatsapp_session_extractions") {
          const idFilter = filters.find(([c]) => c === "id");
          const row = state.extractions.find((e) => e.id === idFilter?.[1]);
          return { data: row ?? null, error: null };
        }
        return { data: null, error: null };
      },
      single: async () => {
        const filters = (api._filters as Array<[string, unknown]>) ?? [];
        if (table === "whatsapp_sessions") {
          const idFilter = filters.find(([c]) => c === "id");
          const row = state.sessions.find((s) => s.id === idFilter?.[1]);
          if (!row) return { data: null, error: { message: "not found" } };
          return { data: row, error: null };
        }
        if (table === "whatsapp_session_business_resolutions") {
          const last = state.resolutions[state.resolutions.length - 1];
          return { data: last ? { id: last.id } : null, error: null };
        }
        return { data: null, error: { message: "not found" } };
      },
      upsert(row: Record<string, unknown>) {
        const existingIdx = state.resolutions.findIndex(
          (r) =>
            r.extraction_id === row.extraction_id &&
            r.schema_version === row.schema_version &&
            r.resolver_version === row.resolver_version,
        );
        const id = existingIdx >= 0 ? state.resolutions[existingIdx].id : RESOLUTION_ID;
        const saved = { ...row, id };
        if (existingIdx >= 0) state.resolutions[existingIdx] = saved;
        else state.resolutions.push(saved);
        return {
          select() {
            return {
              single: async () => ({ data: { id }, error: null }),
            };
          },
        };
      },
    };
    return api;
  };

  return { from } as unknown as SupabaseClient<Database>;
}

describe("classifyDealerIdentity", () => {
  it("requires name or valid phone", () => {
    expect(
      classifyDealerIdentity({ name: null, phone: null, city: null }),
    ).toBe("insufficient_data");
    expect(
      classifyDealerIdentity({ name: "A", phone: null, city: null }),
    ).toBe("identifiable");
    expect(
      classifyDealerIdentity({ name: null, phone: "9876543210", city: null }),
    ).toBe("identifiable");
  });
});

describe("computeVisitReadiness", () => {
  it("marks complete visit ready", () => {
    const r = computeVisitReadiness({
      intent: "visit_report",
      dealerStatus: "matched",
      occurred: true,
      dateResolved: true,
      dateText: "today",
    });
    expect(r).toEqual({ applicable: true, ready: true, missingFields: [] });
  });

  it("not ready when dealer ambiguous", () => {
    const r = computeVisitReadiness({
      intent: "visit_report",
      dealerStatus: "ambiguous",
      occurred: true,
      dateResolved: true,
      dateText: "today",
    });
    expect(r.ready).toBe(false);
    expect(r.missingFields).toContain("dealerResolution.proposedDealerId");
  });

  it("not ready when date unresolved", () => {
    const r = computeVisitReadiness({
      intent: "visit_report",
      dealerStatus: "matched",
      occurred: true,
      dateResolved: false,
      dateText: "soon",
    });
    expect(r.ready).toBe(false);
    expect(r.missingFields).toContain("visit.resolvedDate");
  });

  it("not ready when occurred missing", () => {
    const r = computeVisitReadiness({
      intent: "visit_report",
      dealerStatus: "matched",
      occurred: null,
      dateResolved: true,
      dateText: "today",
    });
    expect(r.ready).toBe(false);
    expect(r.missingFields).toContain("visit.occurred");
  });
});

describe("computeFollowUpReadiness", () => {
  it("marks complete follow-up ready", () => {
    const r = computeFollowUpReadiness({
      intent: "follow_up",
      dealerStatus: "matched",
      requested: true,
      reason: "Call owner",
      dateResolved: true,
      dateText: "tomorrow",
    });
    expect(r.ready).toBe(true);
  });

  it("not ready without date", () => {
    const r = computeFollowUpReadiness({
      intent: "follow_up",
      dealerStatus: "matched",
      requested: true,
      reason: "Call owner",
      dateResolved: false,
      dateText: null,
    });
    expect(r.ready).toBe(false);
    expect(r.missingFields).toContain("followUp.dateText");
  });
});

describe("computeOverallStatus", () => {
  it("ready_for_confirmation when visit+follow-up ready and dealer matched", () => {
    expect(
      computeOverallStatus({
        intent: "mixed",
        dealerStatus: "matched",
        visit: { applicable: true, ready: true },
        followUp: { applicable: true, ready: true },
        ambiguities: [],
      }).status,
    ).toBe("ready_for_confirmation");
  });

  it("needs_clarification on dealer ambiguity", () => {
    expect(
      computeOverallStatus({
        intent: "visit_report",
        dealerStatus: "ambiguous",
        visit: { applicable: true, ready: false },
        followUp: { applicable: false, ready: false },
        ambiguities: [],
      }).status,
    ).toBe("needs_clarification");
  });

  it("not_actionable for unknown with no actions", () => {
    expect(
      computeOverallStatus({
        intent: "unknown",
        dealerStatus: "insufficient_data",
        visit: { applicable: false, ready: false },
        followUp: { applicable: false, ready: false },
        ambiguities: [],
      }).status,
    ).toBe("not_actionable");
  });
});

describe("resolveWhatsAppExtraction", () => {
  beforeEach(() => {
    matchDealerMock.mockReset();
  });

  it("builds ready_for_confirmation for unique dealer + dates", async () => {
    matchDealerMock.mockResolvedValue({
      status: "exact_match",
      dealer: {
        id: DEALER_ID,
        business_name: "Gupta Electricals",
        city: null,
        state: null,
        phone_number: null,
        whatsapp_number: null,
        gst_number: null,
      },
    });

    const state: State = {
      extractions: [
        {
          id: EXTRACTION_ID,
          session_id: SESSION_ID,
          status: "succeeded",
          parsed_output: baseExtraction(),
        },
      ],
      sessions: [
        {
          id: SESSION_ID,
          last_message_at: "2026-08-20T06:30:00.000Z",
          started_at: "2026-08-20T06:00:00.000Z",
        },
      ],
      resolutions: [],
    };

    const result = await resolveWhatsAppExtraction(
      createMockSupabase(state),
      EXTRACTION_ID,
    );

    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") return;
    expect(result.skippedRebuild).toBe(false);
    expect(result.resolution.overall.status).toBe("ready_for_confirmation");
    expect(result.resolution.dealerResolution.status).toBe("matched");
    expect(result.resolution.visitResolution.resolvedDate).toBe("2026-08-20");
    expect(result.resolution.followUpResolution.resolvedDate).toBe("2026-08-24");
    expect(state.resolutions).toHaveLength(1);
    expect(matchDealerMock).toHaveBeenCalled();
  });

  it("maps multiple dealers to ambiguous / needs_clarification", async () => {
    matchDealerMock.mockResolvedValue({
      status: "possible_matches",
      candidates: [
        {
          id: DEALER_ID,
          business_name: "Gupta Electricals",
          city: "Indore",
          state: null,
          phone_number: null,
          whatsapp_number: null,
          gst_number: null,
        },
        {
          id: DEALER_ID_2,
          business_name: "Gupta Electricals",
          city: "Bhopal",
          state: null,
          phone_number: null,
          whatsapp_number: null,
          gst_number: null,
        },
      ],
    });

    const state: State = {
      extractions: [
        {
          id: EXTRACTION_ID,
          session_id: SESSION_ID,
          status: "succeeded",
          parsed_output: baseExtraction(),
        },
      ],
      sessions: [
        {
          id: SESSION_ID,
          last_message_at: "2026-08-20T06:30:00.000Z",
          started_at: "2026-08-20T06:00:00.000Z",
        },
      ],
      resolutions: [],
    };

    const result = await resolveWhatsAppExtraction(
      createMockSupabase(state),
      EXTRACTION_ID,
    );
    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") return;
    expect(result.resolution.dealerResolution.status).toBe("ambiguous");
    expect(result.resolution.overall.status).toBe("needs_clarification");
    expect(result.resolution.dealerResolution.proposedDealerId).toBeNull();
  });

  it("returns existing resolution idempotently without rematching", async () => {
    const existing = {
      schemaVersion: WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION,
      resolverVersion: WHATSAPP_BUSINESS_RESOLVER_VERSION,
      extractionId: EXTRACTION_ID,
      sessionId: SESSION_ID,
      intent: { type: "mixed" as const },
      dealerResolution: {
        status: "matched" as const,
        proposedDealerId: DEALER_ID,
        candidateDealerIds: [DEALER_ID],
        normalizedPhone: null,
        extractedName: "Gupta Electricals",
        reason: "Unique deterministic dealer match",
      },
      visitResolution: {
        applicable: true,
        occurred: true,
        resolvedDate: "2026-08-20",
        resolvedTime: null,
        outcome: null,
        notes: null,
        ready: true,
        missingFields: [] as string[],
      },
      followUpResolution: {
        applicable: false,
        requested: null,
        resolvedDate: null,
        reason: null,
        ready: false,
        missingFields: [] as string[],
      },
      overall: {
        status: "ready_for_confirmation" as const,
        reasons: [] as string[],
      },
    };

    const state: State = {
      extractions: [],
      sessions: [],
      resolutions: [
        {
          id: RESOLUTION_ID,
          extraction_id: EXTRACTION_ID,
          schema_version: WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION,
          resolver_version: WHATSAPP_BUSINESS_RESOLVER_VERSION,
          resolution: existing,
        },
      ],
    };

    const result = await resolveWhatsAppExtraction(
      createMockSupabase(state),
      EXTRACTION_ID,
    );
    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") return;
    expect(result.skippedRebuild).toBe(true);
    expect(matchDealerMock).not.toHaveBeenCalled();
    expect(state.resolutions).toHaveLength(1);
  });

  it("skips non-succeeded extractions", async () => {
    const state: State = {
      extractions: [
        {
          id: EXTRACTION_ID,
          session_id: SESSION_ID,
          status: "processing",
          parsed_output: null,
        },
      ],
      sessions: [],
      resolutions: [],
    };
    const result = await resolveWhatsAppExtraction(
      createMockSupabase(state),
      EXTRACTION_ID,
    );
    expect(result.status).toBe("skipped");
  });

  it("never invents a dealer id on no_match", async () => {
    matchDealerMock.mockResolvedValue({ status: "no_match" });
    const state: State = {
      extractions: [
        {
          id: EXTRACTION_ID,
          session_id: SESSION_ID,
          status: "succeeded",
          parsed_output: baseExtraction(),
        },
      ],
      sessions: [
        {
          id: SESSION_ID,
          last_message_at: "2026-08-20T06:30:00.000Z",
          started_at: "2026-08-20T06:00:00.000Z",
        },
      ],
      resolutions: [],
    };
    const result = await resolveWhatsAppExtraction(
      createMockSupabase(state),
      EXTRACTION_ID,
    );
    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") return;
    expect(result.resolution.dealerResolution.status).toBe("not_found");
    expect(result.resolution.dealerResolution.proposedDealerId).toBeNull();
    expect(result.resolution.overall.status).toBe("needs_clarification");
  });

  it("normalizes phone before matching", async () => {
    matchDealerMock.mockResolvedValue({ status: "no_match" });
    const state: State = {
      extractions: [
        {
          id: EXTRACTION_ID,
          session_id: SESSION_ID,
          status: "succeeded",
          parsed_output: baseExtraction({
            dealer: {
              name: null,
              phone: "+91 98765 43210",
              locality: null,
              city: null,
              address: null,
            },
          }),
        },
      ],
      sessions: [
        {
          id: SESSION_ID,
          last_message_at: "2026-08-20T06:30:00.000Z",
          started_at: "2026-08-20T06:00:00.000Z",
        },
      ],
      resolutions: [],
    };
    await resolveWhatsAppExtraction(createMockSupabase(state), EXTRACTION_ID);
    expect(matchDealerMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ phone: "+91 98765 43210" }),
    );
  });
});
