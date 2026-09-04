import { describe, expect, it } from "vitest";
import {
  buildNextFollowupDraft,
  computeFollowupsSummary,
  deriveFollowupDueBucket,
  groupFollowupsByDue,
  resolveDealerCallPhone,
} from "./followups";
import type { SalesmanFollowupItem } from "@/lib/types/followups";

function makeItem(overrides: Partial<SalesmanFollowupItem> & Pick<SalesmanFollowupItem, "id" | "dueBucket">): SalesmanFollowupItem {
  return {
    description: "Test follow-up",
    dueDate: "2026-09-02",
    priority: "medium",
    status: "pending",
    dealerId: "d1",
    dealerName: "Sharma Auto",
    city: "Indore",
    dealerPhone: "919888888888",
    telLink: "tel:919888888888",
    productContext: null,
    createdFromVisitId: null,
    ...overrides,
  };
}

describe("deriveFollowupDueBucket", () => {
  const now = new Date("2026-09-02T12:00:00");

  it("returns overdue for past pending dates", () => {
    expect(deriveFollowupDueBucket("2026-09-01", "pending", now)).toBe("overdue");
  });

  it("returns due_today for today", () => {
    expect(deriveFollowupDueBucket("2026-09-02", "pending", now)).toBe("due_today");
  });

  it("returns upcoming for future dates", () => {
    expect(deriveFollowupDueBucket("2026-09-10", "pending", now)).toBe("upcoming");
  });

  it("returns null for completed follow-ups", () => {
    expect(deriveFollowupDueBucket("2026-09-01", "completed", now)).toBeNull();
  });
});

describe("resolveDealerCallPhone", () => {
  it("prefers dealer phone_number", () => {
    expect(
      resolveDealerCallPhone(
        { phone_number: "+91 98888 88888", whatsapp_number: "9999999999" },
        [{ phone_number: "9777777777" }],
      ),
    ).toEqual({ phone: "+91 98888 88888", telLink: "tel:919888888888" });
  });

  it("falls back to whatsapp then contact", () => {
    expect(
      resolveDealerCallPhone(
        { phone_number: null, whatsapp_number: "9888888888" },
        [],
      ).telLink,
    ).toBe("tel:9888888888");

    expect(
      resolveDealerCallPhone(
        { phone_number: null, whatsapp_number: null },
        [{ phone_number: "9876543210" }],
      ).telLink,
    ).toBe("tel:9876543210");
  });

  it("returns null when no usable number", () => {
    expect(
      resolveDealerCallPhone({ phone_number: null, whatsapp_number: null }, []),
    ).toEqual({ phone: null, telLink: null });
  });
});

describe("buildNextFollowupDraft", () => {
  it("requires next date for call again and send quotation", () => {
    expect(buildNextFollowupDraft("call_again", "PPF quote").requiresNextDate).toBe(true);
    expect(buildNextFollowupDraft("send_quotation", "PPF quote").description).toBe("Send quotation");
    expect(buildNextFollowupDraft("no_answer", "Call").requiresNextDate).toBe(true);
  });

  it("does not allow next date for not interested", () => {
    const draft = buildNextFollowupDraft("not_interested", "PPF quote");
    expect(draft.requiresNextDate).toBe(false);
    expect(draft.allowsNextDate).toBe(false);
  });

  it("allows optional next date for interested", () => {
    const draft = buildNextFollowupDraft("interested", "PPF quote");
    expect(draft.requiresNextDate).toBe(false);
    expect(draft.allowsNextDate).toBe(true);
  });
});

describe("groupFollowupsByDue", () => {
  it("groups and sorts by due date within buckets", () => {
    const grouped = groupFollowupsByDue([
      makeItem({ id: "1", dueBucket: "upcoming", dueDate: "2026-09-10" }),
      makeItem({ id: "2", dueBucket: "overdue", dueDate: "2026-08-30" }),
      makeItem({ id: "3", dueBucket: "overdue", dueDate: "2026-08-28" }),
      makeItem({ id: "4", dueBucket: "due_today", dueDate: "2026-09-02" }),
    ]);

    expect(grouped.overdue.map((i) => i.id)).toEqual(["3", "2"]);
    expect(grouped.dueToday.map((i) => i.id)).toEqual(["4"]);
    expect(grouped.upcoming.map((i) => i.id)).toEqual(["1"]);
  });
});

describe("computeFollowupsSummary", () => {
  it("counts buckets", () => {
    const summary = computeFollowupsSummary({
      overdue: [makeItem({ id: "1", dueBucket: "overdue" })],
      dueToday: [makeItem({ id: "2", dueBucket: "due_today" }), makeItem({ id: "3", dueBucket: "due_today" })],
      upcoming: [],
    });
    expect(summary).toEqual({ overdue: 1, dueToday: 2, upcoming: 0, total: 3 });
  });
});

describe("createFollowupFromVisit payload contract", () => {
  it("maps visit next actions to follow-up descriptions used on insert", async () => {
    const { buildVisitFollowupDescription } = await import(
      "@/lib/validations/visit-next-action"
    );

    expect(buildVisitFollowupDescription("call_dealer")).toBe("Call dealer");
    expect(
      buildVisitFollowupDescription("send_quotation", undefined, "Send revised PPF quote"),
    ).toBe("Send quotation — Send revised PPF quote");
    expect(buildVisitFollowupDescription("other", "Confirm installation date")).toBe(
      "Confirm installation date",
    );
  });
});
