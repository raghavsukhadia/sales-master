import { describe, expect, it } from "vitest";
import {
  computeVisitActivitySummary,
  matchesVisitActivityFollowUp,
  matchesVisitActivitySearch,
  paginateVisitActivityItems,
  sortVisitActivityItems,
} from "./visit-activity";
import type { VisitActivityItem } from "@/lib/types/visit-activity";

function makeVisit(overrides: Partial<VisitActivityItem> = {}): VisitActivityItem {
  return {
    id: "v1",
    visitNumber: "V-1001",
    dealerId: "d1",
    dealerName: "F7 CAR SPA",
    dealerPhone: "9998973711",
    dealerType: "existing",
    city: "Surat",
    state: "Gujarat",
    visitedAt: "2026-09-03T10:53:00.000Z",
    salespersonId: "s1",
    salespersonName: "Rahul Sharma",
    orderPlaced: true,
    items: [{ productName: "Ceramic Shield", quantity: 10, unit: "pcs" }],
    productCount: 1,
    totalQuantity: 10,
    followUpStatus: "pending",
    followUpDate: "2026-09-04",
    latitude: null,
    longitude: null,
    locationCaptured: false,
    source: "web",
    ...overrides,
  };
}

describe("matchesVisitActivityFollowUp", () => {
  const now = new Date("2026-09-04T12:00:00");

  it("matches scheduled as pending", () => {
    expect(matchesVisitActivityFollowUp(makeVisit({ followUpStatus: "pending" }), "scheduled", now)).toBe(
      true,
    );
    expect(matchesVisitActivityFollowUp(makeVisit({ followUpStatus: "overdue" }), "scheduled", now)).toBe(
      false,
    );
  });

  it("matches none", () => {
    expect(matchesVisitActivityFollowUp(makeVisit({ followUpStatus: "none" }), "none", now)).toBe(true);
    expect(matchesVisitActivityFollowUp(makeVisit({ followUpStatus: "pending" }), "none", now)).toBe(
      false,
    );
  });

  it("matches due_today only for pending due on today", () => {
    expect(
      matchesVisitActivityFollowUp(
        makeVisit({ followUpStatus: "pending", followUpDate: "2026-09-04" }),
        "due_today",
        now,
      ),
    ).toBe(true);
    expect(
      matchesVisitActivityFollowUp(
        makeVisit({ followUpStatus: "pending", followUpDate: "2026-09-05" }),
        "due_today",
        now,
      ),
    ).toBe(false);
    expect(
      matchesVisitActivityFollowUp(
        makeVisit({ followUpStatus: "overdue", followUpDate: "2026-09-04" }),
        "due_today",
        now,
      ),
    ).toBe(false);
  });

  it("matches overdue and completed", () => {
    expect(matchesVisitActivityFollowUp(makeVisit({ followUpStatus: "overdue" }), "overdue", now)).toBe(
      true,
    );
    expect(
      matchesVisitActivityFollowUp(makeVisit({ followUpStatus: "completed" }), "completed", now),
    ).toBe(true);
  });
});

describe("matchesVisitActivitySearch", () => {
  it("searches dealer, salesman, phone, city, and product", () => {
    const visit = makeVisit();
    expect(matchesVisitActivitySearch(visit, "f7")).toBe(true);
    expect(matchesVisitActivitySearch(visit, "rahul")).toBe(true);
    expect(matchesVisitActivitySearch(visit, "9998")).toBe(true);
    expect(matchesVisitActivitySearch(visit, "surat")).toBe(true);
    expect(matchesVisitActivitySearch(visit, "ceramic")).toBe(true);
    expect(matchesVisitActivitySearch(visit, "zzzz")).toBe(false);
  });
});

describe("computeVisitActivitySummary", () => {
  it("computes admin KPIs", () => {
    const items = [
      makeVisit({ id: "1", salespersonId: "s1", dealerType: "new", orderPlaced: true, followUpStatus: "pending" }),
      makeVisit({
        id: "2",
        salespersonId: "s1",
        dealerType: "existing",
        orderPlaced: false,
        followUpStatus: "overdue",
      }),
      makeVisit({
        id: "3",
        salespersonId: "s2",
        dealerType: "new",
        orderPlaced: true,
        followUpStatus: "none",
      }),
    ];

    expect(computeVisitActivitySummary(items)).toEqual({
      totalVisits: 3,
      activeSalesmen: 2,
      newDealers: 2,
      orders: 2,
      followUpsDue: 2,
    });
  });
});

describe("sortVisitActivityItems", () => {
  const items = [
    makeVisit({
      id: "a",
      visitedAt: "2026-09-01T10:00:00.000Z",
      salespersonName: "Zara",
      dealerName: "Beta",
      orderPlaced: false,
    }),
    makeVisit({
      id: "b",
      visitedAt: "2026-09-03T10:00:00.000Z",
      salespersonName: "Amit",
      dealerName: "Alpha",
      orderPlaced: true,
    }),
  ];

  it("sorts newest first by default", () => {
    expect(sortVisitActivityItems(items, "newest").map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("sorts by salesman name", () => {
    expect(sortVisitActivityItems(items, "salesman").map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("sorts by dealer name", () => {
    expect(sortVisitActivityItems(items, "dealer").map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("sorts order-placed before no-order for result", () => {
    expect(sortVisitActivityItems(items, "result").map((v) => v.id)).toEqual(["b", "a"]);
  });
});

describe("paginateVisitActivityItems", () => {
  const items = Array.from({ length: 30 }, (_, i) => makeVisit({ id: `v${i + 1}` }));

  it("slices pages of 25", () => {
    const page1 = paginateVisitActivityItems(items, 1, 25);
    expect(page1.pageItems).toHaveLength(25);
    expect(page1.totalPages).toBe(2);
    expect(page1.totalCount).toBe(30);
    expect(page1.page).toBe(1);

    const page2 = paginateVisitActivityItems(items, 2, 25);
    expect(page2.pageItems).toHaveLength(5);
    expect(page2.page).toBe(2);
  });

  it("clamps out-of-range page", () => {
    const result = paginateVisitActivityItems(items, 99, 25);
    expect(result.page).toBe(2);
    expect(result.pageItems).toHaveLength(5);
  });
});
