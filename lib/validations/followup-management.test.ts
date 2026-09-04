import { describe, expect, it } from "vitest";
import {
  clearAdvancedFollowupManagementFilters,
  countAdvancedFollowupManagementFilters,
  followupManagementFiltersToParams,
  hasActiveFollowupManagementFilters,
  parseFollowupManagementSearchParams,
} from "./followup-management";
import { DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS } from "@/lib/types/followup-management";

describe("parseFollowupManagementSearchParams", () => {
  it("applies defaults", () => {
    expect(parseFollowupManagementSearchParams(new URLSearchParams())).toEqual(
      DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS,
    );
  });

  it("parses valid filters", () => {
    const params = new URLSearchParams({
      status: "overdue",
      priority: "high",
      outcome: "no_answer",
      sort: "priority",
      page: "2",
      q: "F7",
      salesman: "11111111-1111-4111-8111-111111111111",
      state: "Gujarat",
      city: "Surat",
      dueFrom: "2026-09-01",
      dueTo: "2026-09-30",
    });

    expect(parseFollowupManagementSearchParams(params)).toEqual({
      status: "overdue",
      priority: "high",
      outcome: "no_answer",
      sort: "priority",
      page: 2,
      q: "F7",
      salesman: "11111111-1111-4111-8111-111111111111",
      state: "Gujarat",
      city: "Surat",
      dueFrom: "2026-09-01",
      dueTo: "2026-09-30",
    });
  });

  it("rejects invalid values", () => {
    const parsed = parseFollowupManagementSearchParams(
      new URLSearchParams({
        status: "later",
        priority: "urgent",
        outcome: "won",
        sort: "value",
        page: "0",
        salesman: "bad",
      }),
    );
    expect(parsed.status).toBe("all");
    expect(parsed.priority).toBe("all");
    expect(parsed.outcome).toBe("all");
    expect(parsed.sort).toBe("due");
    expect(parsed.page).toBe(1);
    expect(parsed.salesman).toBeUndefined();
  });
});

describe("countAdvancedFollowupManagementFilters", () => {
  it("ignores status search and sort", () => {
    expect(
      countAdvancedFollowupManagementFilters({
        ...DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS,
        status: "overdue",
        q: "f7",
        sort: "newest",
      }),
    ).toBe(0);
  });

  it("counts advanced filters", () => {
    expect(
      countAdvancedFollowupManagementFilters({
        ...DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS,
        salesman: "11111111-1111-4111-8111-111111111111",
        state: "Gujarat",
        city: "Surat",
        priority: "high",
        outcome: "interested",
        dueFrom: "2026-09-01",
        dueTo: "2026-09-30",
      }),
    ).toBe(7);
  });
});

describe("clearAdvancedFollowupManagementFilters", () => {
  it("preserves status search and sort", () => {
    const cleared = clearAdvancedFollowupManagementFilters({
      ...DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS,
      status: "due_today",
      q: "rahul",
      sort: "salesman",
      page: 4,
      salesman: "11111111-1111-4111-8111-111111111111",
      priority: "high",
      outcome: "no_answer",
    });

    expect(cleared).toEqual({
      ...DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS,
      status: "due_today",
      q: "rahul",
      sort: "salesman",
      page: 1,
    });
  });
});

describe("hasActiveFollowupManagementFilters / round-trip", () => {
  it("detects active filters", () => {
    expect(hasActiveFollowupManagementFilters(DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS)).toBe(false);
    expect(
      hasActiveFollowupManagementFilters({
        ...DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS,
        status: "overdue",
      }),
    ).toBe(true);
  });

  it("round-trips params", () => {
    const filters = parseFollowupManagementSearchParams(
      new URLSearchParams({
        status: "completed",
        outcome: "interested",
        page: "2",
      }),
    );
    const params = followupManagementFiltersToParams(filters);
    expect(parseFollowupManagementSearchParams(params)).toEqual(filters);
  });
});
