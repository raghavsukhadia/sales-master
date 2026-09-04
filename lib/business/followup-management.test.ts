import { describe, expect, it } from "vitest";
import {
  buildFollowupTimeline,
  computeFollowupManagementSummary,
  deriveAttention,
  deriveLastAction,
  paginateFollowupManagementItems,
  sortFollowupManagementItems,
} from "./followup-management";
import type { FollowupManagementItem } from "@/lib/types/followup-management";

function makeItem(overrides: Partial<FollowupManagementItem> = {}): FollowupManagementItem {
  return {
    id: "f1",
    description: "Call dealer",
    dueDate: "2026-09-04",
    priority: "medium",
    status: "pending",
    displayStatus: "due_today",
    dealerId: "d1",
    dealerName: "F7 CAR SPA",
    dealerPhone: "9998973711",
    city: "Surat",
    state: "Gujarat",
    salesmanId: "s1",
    salesmanName: "Demo Sales",
    productContext: "Ceramic Shield",
    createdFromVisitId: "v1",
    parentFollowupId: null,
    outcome: null,
    completedAt: null,
    completionNotes: null,
    createdAt: "2026-09-03T10:00:00.000Z",
    lastAction: {
      label: "No action recorded",
      outcome: null,
      at: null,
      notes: null,
    },
    needsAttention: false,
    attentionReasons: [],
    nextDescription: "Call dealer",
    nextDueDate: "2026-09-04",
    ...overrides,
  };
}

describe("deriveLastAction", () => {
  it("uses own outcome when completed", () => {
    expect(
      deriveLastAction({
        status: "completed",
        outcome: "interested",
        completedAt: "2026-09-04T11:14:00.000Z",
        completionNotes: "Wants pricing",
        parent: null,
      }),
    ).toEqual({
      label: "Interested",
      outcome: "interested",
      at: "2026-09-04T11:14:00.000Z",
      notes: "Wants pricing",
    });
  });

  it("falls back to parent outcome for pending child", () => {
    expect(
      deriveLastAction({
        status: "pending",
        outcome: null,
        completedAt: null,
        completionNotes: null,
        parent: {
          outcome: "no_answer",
          completed_at: "2026-09-03T17:00:00.000Z",
          completion_notes: null,
        },
      }).label,
    ).toBe("No answer");
  });

  it("returns no action recorded when nothing available", () => {
    expect(
      deriveLastAction({
        status: "pending",
        outcome: null,
        completedAt: null,
        completionNotes: null,
        parent: null,
      }).label,
    ).toBe("No action recorded");
  });
});

describe("deriveAttention", () => {
  it("flags overdue pending", () => {
    const result = deriveAttention({
      status: "pending",
      displayStatus: "overdue",
      priority: "high",
      parentFollowupId: null,
      outcome: null,
      hasChild: false,
    });
    expect(result.needsAttention).toBe(true);
    expect(result.reasons).toContain("Overdue");
    expect(result.reasons).toContain("High priority overdue");
    expect(result.reasons).toContain("No prior outcome");
  });

  it("flags interested without next follow-up", () => {
    const result = deriveAttention({
      status: "completed",
      displayStatus: "completed",
      priority: "medium",
      parentFollowupId: null,
      outcome: "interested",
      hasChild: false,
    });
    expect(result.needsAttention).toBe(true);
    expect(result.reasons).toContain("Interested without next follow-up");
  });
});

describe("computeFollowupManagementSummary", () => {
  it("computes KPI counts", () => {
    const items = [
      makeItem({ id: "1", displayStatus: "overdue", status: "pending" }),
      makeItem({ id: "2", displayStatus: "due_today", status: "pending" }),
      makeItem({ id: "3", displayStatus: "upcoming", status: "pending" }),
      makeItem({
        id: "4",
        displayStatus: "completed",
        status: "completed",
        outcome: "no_answer",
      }),
      makeItem({
        id: "5",
        displayStatus: "completed",
        status: "completed",
        outcome: "interested",
      }),
    ];

    expect(computeFollowupManagementSummary(items)).toEqual({
      overdue: 1,
      dueToday: 1,
      upcoming: 1,
      completed: 2,
      noResponse: 1,
    });
  });
});

describe("sortFollowupManagementItems", () => {
  it("sorts due soon with pending first", () => {
    const items = [
      makeItem({
        id: "c",
        status: "completed",
        displayStatus: "completed",
        dueDate: "2026-09-01",
        completedAt: "2026-09-02T10:00:00.000Z",
      }),
      makeItem({ id: "b", status: "pending", displayStatus: "upcoming", dueDate: "2026-09-10" }),
      makeItem({ id: "a", status: "pending", displayStatus: "overdue", dueDate: "2026-09-01" }),
    ];
    expect(sortFollowupManagementItems(items, "due").map((i) => i.id)).toEqual(["a", "b", "c"]);
  });
});

describe("paginateFollowupManagementItems", () => {
  it("paginates and clamps page", () => {
    const items = Array.from({ length: 30 }, (_, i) => makeItem({ id: `f${i + 1}` }));
    const page1 = paginateFollowupManagementItems(items, 1, 25);
    expect(page1.pageItems).toHaveLength(25);
    expect(page1.totalPages).toBe(2);
    expect(paginateFollowupManagementItems(items, 99, 25).page).toBe(2);
  });
});

describe("buildFollowupTimeline", () => {
  it("includes visit, create, and completion events", () => {
    const item = makeItem({
      status: "completed",
      displayStatus: "completed",
      outcome: "interested",
      completedAt: "2026-09-04T11:14:00.000Z",
      completionNotes: "Wants pricing",
    });
    const events = buildFollowupTimeline({
      item,
      parent: null,
      child: {
        id: "child1",
        description: "Send quotation",
        due_date: "2026-09-06",
        created_at: "2026-09-04T11:15:00.000Z",
      },
      visitDate: "2026-09-03T09:53:00.000Z",
    });

    expect(events.map((e) => e.title)).toEqual([
      "Dealer visited by Demo Sales",
      "Follow-up created",
      "Outcome: Interested",
      "Next follow-up scheduled",
    ]);
  });
});
