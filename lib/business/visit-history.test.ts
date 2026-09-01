import { describe, expect, it } from "vitest";
import {
  computeSummary,
  deriveDealerType,
  deriveFollowUpStatus,
  getDateRangeBounds,
} from "./visit-history";
import type { VisitHistoryItem } from "@/lib/types/visit-history";

describe("deriveFollowUpStatus", () => {
  it("returns none when no follow-up", () => {
    expect(deriveFollowUpStatus(null)).toBe("none");
  });

  it("returns completed for completed follow-ups", () => {
    expect(
      deriveFollowUpStatus(
        { due_date: "2026-09-01", status: "completed" },
        new Date("2026-09-05"),
      ),
    ).toBe("completed");
  });

  it("returns overdue for pending past-due follow-ups", () => {
    expect(
      deriveFollowUpStatus(
        { due_date: "2026-09-01", status: "pending" },
        new Date("2026-09-05"),
      ),
    ).toBe("overdue");
  });

  it("returns pending for future follow-ups", () => {
    expect(
      deriveFollowUpStatus(
        { due_date: "2026-09-10", status: "pending" },
        new Date("2026-09-05"),
      ),
    ).toBe("pending");
  });
});

describe("deriveDealerType", () => {
  it("marks first visit to dealer as new", () => {
    expect(
      deriveDealerType(
        { dealer_id: "d1", visit_date: "2026-09-05T10:00:00Z" },
        [{ dealer_id: "d1", visit_date: "2026-09-05T10:00:00Z" }],
      ),
    ).toBe("new");
  });

  it("marks repeat visit as existing", () => {
    expect(
      deriveDealerType(
        { dealer_id: "d1", visit_date: "2026-09-10T10:00:00Z" },
        [
          { dealer_id: "d1", visit_date: "2026-09-01T10:00:00Z" },
          { dealer_id: "d1", visit_date: "2026-09-10T10:00:00Z" },
        ],
      ),
    ).toBe("existing");
  });
});

describe("computeSummary", () => {
  const base: VisitHistoryItem = {
    id: "1",
    visitNumber: "V-1001",
    dealerId: "d1",
    dealerName: "Test",
    dealerType: "new",
    visitedAt: "2026-09-01",
    orderPlaced: false,
    items: [],
    productCount: 0,
    totalQuantity: 0,
    followUpStatus: "none",
    locationCaptured: false,
  };

  it("counts visits, orders, and follow-ups", () => {
    expect(
      computeSummary([
        base,
        { ...base, id: "2", orderPlaced: true, followUpStatus: "pending" },
        { ...base, id: "3", followUpStatus: "overdue" },
      ]),
    ).toEqual({
      totalVisits: 3,
      ordersPlaced: 1,
      noOrder: 2,
      pendingFollowUps: 2,
    });
  });
});

describe("getDateRangeBounds", () => {
  it("returns today bounds", () => {
    const now = new Date("2026-09-05T15:30:00");
    const { from, to } = getDateRangeBounds("today", undefined, undefined, now);
    expect(from.getHours()).toBe(0);
    expect(to.getHours()).toBe(23);
  });

  it("returns custom bounds", () => {
    const { from, to } = getDateRangeBounds("custom", "2026-09-01", "2026-09-03");
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(8);
    expect(from.getDate()).toBe(1);
    expect(to.getFullYear()).toBe(2026);
    expect(to.getMonth()).toBe(8);
    expect(to.getDate()).toBe(3);
  });
});
