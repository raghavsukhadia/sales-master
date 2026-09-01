import { describe, expect, it } from "vitest";
import { sortVisits } from "./visit-history-sort";
import type { VisitHistoryItem } from "@/lib/types/visit-history";

function makeVisit(partial: Partial<VisitHistoryItem> & Pick<VisitHistoryItem, "id" | "visitedAt">): VisitHistoryItem {
  return {
    visitNumber: null,
    dealerId: "d1",
    dealerName: "Dealer",
    dealerType: "existing",
    orderPlaced: false,
    items: [],
    productCount: 0,
    totalQuantity: 0,
    followUpStatus: "none",
    locationCaptured: false,
    ...partial,
  };
}

describe("sortVisits", () => {
  const visits = [
    makeVisit({ id: "1", visitedAt: "2026-09-01T10:00:00Z", orderValue: 1000 }),
    makeVisit({ id: "2", visitedAt: "2026-09-05T10:00:00Z", orderValue: 5000 }),
    makeVisit({
      id: "3",
      visitedAt: "2026-09-03T10:00:00Z",
      followUpStatus: "overdue",
      followUpDate: "2026-09-01",
    }),
  ];

  it("sorts newest first by default", () => {
    expect(sortVisits(visits, "newest").map((v) => v.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts oldest first", () => {
    expect(sortVisits(visits, "oldest").map((v) => v.id)).toEqual(["1", "3", "2"]);
  });

  it("sorts by order value", () => {
    expect(sortVisits(visits, "order_value").map((v) => v.id)).toEqual(["2", "1", "3"]);
  });

  it("prioritizes follow-up due visits", () => {
    expect(sortVisits(visits, "follow_up_due").map((v) => v.id)[0]).toBe("3");
  });
});
