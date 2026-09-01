import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { WHATSAPP_RESOLUTION_FIXTURES } from "@/tests/fixtures/whatsapp/resolution-corpus";
import { resolveBusinessDate } from "@/lib/business/whatsapp-date-resolution";
import {
  classifyDealerIdentity,
  computeOverallStatus,
  resolveWhatsAppExtraction,
} from "@/lib/business/whatsapp-business-resolution";

vi.mock("@/lib/business/dealer-matching", () => ({
  matchDealer: vi.fn(),
}));

import { matchDealer } from "@/lib/business/dealer-matching";

const matchDealerMock = vi.mocked(matchDealer);

const EXTRACTION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function createMockSupabase(args: {
  extraction: unknown;
  referenceInstant: string;
  resolutions?: Array<Record<string, unknown>>;
}) {
  const state = {
    resolutions: args.resolutions ?? ([] as Array<Record<string, unknown>>),
  };

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
        if (table === "whatsapp_session_business_resolutions") {
          return { data: state.resolutions[0] ?? null, error: null };
        }
        if (table === "whatsapp_session_extractions") {
          return {
            data: {
              id: EXTRACTION_ID,
              session_id: SESSION_ID,
              status: "succeeded",
              parsed_output: args.extraction,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      },
      single: async () => {
        if (table === "whatsapp_sessions") {
          return {
            data: {
              id: SESSION_ID,
              last_message_at: args.referenceInstant,
              started_at: args.referenceInstant,
            },
            error: null,
          };
        }
        return {
          data: { id: "ffffffff-ffff-4fff-8fff-ffffffffffff" },
          error: null,
        };
      },
      upsert(row: Record<string, unknown>) {
        state.resolutions = [{ ...row, id: "ffffffff-ffff-4fff-8fff-ffffffffffff" }];
        return {
          select() {
            return {
              single: async () => ({
                data: { id: "ffffffff-ffff-4fff-8fff-ffffffffffff" },
                error: null,
              }),
            };
          },
        };
      },
    };
    return api;
  };

  return { from } as unknown as SupabaseClient<Database>;
}

describe("WhatsApp resolution evaluation corpus", () => {
  beforeEach(() => {
    matchDealerMock.mockReset();
  });

  for (const fixture of WHATSAPP_RESOLUTION_FIXTURES) {
    it(`${fixture.id}: ${fixture.description}`, async () => {
      const identity = classifyDealerIdentity({
        name: fixture.extraction.dealer.name,
        phone: fixture.extraction.dealer.phone,
        city: fixture.extraction.dealer.city,
      });

      if (fixture.dealerMatch?.status === "skip_match" || identity === "insufficient_data") {
        // pure path without matcher
      } else if (fixture.dealerMatch?.status === "exact_match") {
        matchDealerMock.mockResolvedValue({
          status: "exact_match",
          dealer: {
            id: fixture.dealerMatch.dealerId,
            business_name: fixture.extraction.dealer.name ?? "Dealer",
            city: fixture.extraction.dealer.city,
            state: null,
            phone_number: fixture.extraction.dealer.phone,
            whatsapp_number: null,
            gst_number: null,
          },
        });
      } else if (fixture.dealerMatch?.status === "possible_matches") {
        matchDealerMock.mockResolvedValue({
          status: "possible_matches",
          candidates: fixture.dealerMatch.dealerIds.map((id, i) => ({
            id,
            business_name: fixture.extraction.dealer.name ?? `Dealer ${i}`,
            city: null,
            state: null,
            phone_number: null,
            whatsapp_number: null,
            gst_number: null,
          })),
        });
      } else {
        matchDealerMock.mockResolvedValue({ status: "no_match" });
      }

      // Pure date + readiness checks (always)
      const visitDate = resolveBusinessDate(
        fixture.extraction.visit.dateText,
        fixture.referenceInstant,
      );
      const followUpDate = resolveBusinessDate(
        fixture.extraction.followUp.dateText,
        fixture.referenceInstant,
      );

      if (fixture.expect.visitDate !== undefined) {
        expect(visitDate.status === "resolved" ? visitDate.value : null).toBe(
          fixture.expect.visitDate,
        );
      }
      if (fixture.expect.followUpDate !== undefined) {
        expect(
          followUpDate.status === "resolved" ? followUpDate.value : null,
        ).toBe(fixture.expect.followUpDate);
      }

      const result = await resolveWhatsAppExtraction(
        createMockSupabase({
          extraction: fixture.extraction,
          referenceInstant: fixture.referenceInstant,
        }),
        EXTRACTION_ID,
      );

      expect(result.status).toBe("succeeded");
      if (result.status !== "succeeded") return;

      if (fixture.expect.dealerStatus) {
        expect(result.resolution.dealerResolution.status).toBe(
          fixture.expect.dealerStatus,
        );
      }
      if (fixture.expect.visitReady !== undefined) {
        expect(result.resolution.visitResolution.ready).toBe(fixture.expect.visitReady);
      }
      if (fixture.expect.followUpReady !== undefined) {
        expect(result.resolution.followUpResolution.ready).toBe(
          fixture.expect.followUpReady,
        );
      }
      expect(result.resolution.overall.status).toBe(fixture.expect.overallStatus);

      // Cross-check pure overall helper still agrees with persisted outcome shape
      const overall = computeOverallStatus({
        intent: fixture.extraction.conversationIntent,
        dealerStatus: result.resolution.dealerResolution.status,
        visit: {
          applicable: result.resolution.visitResolution.applicable,
          ready: result.resolution.visitResolution.ready,
        },
        followUp: {
          applicable: result.resolution.followUpResolution.applicable,
          ready: result.resolution.followUpResolution.ready,
        },
        ambiguities: [
          ...fixture.extraction.ambiguities,
          ...(visitDate.status === "ambiguous"
            ? [{ field: "visit.dateText", reason: visitDate.reason }]
            : []),
          ...(followUpDate.status === "ambiguous"
            ? [{ field: "followUp.dateText", reason: followUpDate.reason }]
            : []),
        ],
      });
      expect(overall.status).toBe(fixture.expect.overallStatus);
    });
  }
});
