import { describe, expect, it } from "vitest";
import {
  clearAdvancedVisitActivityFilters,
  countAdvancedVisitActivityFilters,
  hasActiveVisitActivityFilters,
  parseVisitActivitySearchParams,
  visitActivityFiltersToParams,
} from "./visit-activity";
import { DEFAULT_VISIT_ACTIVITY_FILTERS } from "@/lib/types/visit-activity";

describe("parseVisitActivitySearchParams", () => {
  it("applies defaults for empty params", () => {
    expect(parseVisitActivitySearchParams(new URLSearchParams())).toEqual(
      DEFAULT_VISIT_ACTIVITY_FILTERS,
    );
  });

  it("parses valid filters", () => {
    const params = new URLSearchParams({
      period: "week",
      result: "order",
      dealerType: "new",
      followup: "due_today",
      sort: "salesman",
      page: "3",
      q: "F7",
      salesman: "11111111-1111-4111-8111-111111111111",
      state: "Gujarat",
      city: "Surat",
    });

    expect(parseVisitActivitySearchParams(params)).toEqual({
      period: "week",
      result: "order",
      dealerType: "new",
      followup: "due_today",
      sort: "salesman",
      page: 3,
      q: "F7",
      salesman: "11111111-1111-4111-8111-111111111111",
      state: "Gujarat",
      city: "Surat",
    });
  });

  it("rejects invalid enums and uuid", () => {
    const params = new URLSearchParams({
      period: "year",
      result: "won",
      followup: "maybe",
      sort: "value",
      page: "0",
      salesman: "not-a-uuid",
      from: "bad-date",
    });

    const parsed = parseVisitActivitySearchParams(params);
    expect(parsed.period).toBe("month");
    expect(parsed.result).toBe("all");
    expect(parsed.followup).toBe("all");
    expect(parsed.sort).toBe("newest");
    expect(parsed.page).toBe(1);
    expect(parsed.salesman).toBeUndefined();
    expect(parsed.from).toBeUndefined();
  });

  it("accepts custom period dates", () => {
    const params = new URLSearchParams({
      period: "custom",
      from: "2026-09-01",
      to: "2026-09-04",
    });
    const parsed = parseVisitActivitySearchParams(params);
    expect(parsed.period).toBe("custom");
    expect(parsed.from).toBe("2026-09-01");
    expect(parsed.to).toBe("2026-09-04");
  });

  it("accepts search alias", () => {
    const params = new URLSearchParams({ search: "ceramic" });
    expect(parseVisitActivitySearchParams(params).q).toBe("ceramic");
  });
});

describe("visitActivityFiltersToParams", () => {
  it("omits default values", () => {
    const params = visitActivityFiltersToParams(DEFAULT_VISIT_ACTIVITY_FILTERS);
    expect(params.toString()).toBe("");
  });

  it("round-trips non-default filters", () => {
    const filters = parseVisitActivitySearchParams(
      new URLSearchParams({
        period: "today",
        result: "no_order",
        followup: "overdue",
        page: "2",
        q: "rahul",
      }),
    );
    const params = visitActivityFiltersToParams(filters);
    expect(parseVisitActivitySearchParams(params)).toEqual(filters);
  });
});

describe("hasActiveVisitActivityFilters", () => {
  it("is false for defaults", () => {
    expect(hasActiveVisitActivityFilters(DEFAULT_VISIT_ACTIVITY_FILTERS)).toBe(false);
  });

  it("is true when a filter is set", () => {
    expect(
      hasActiveVisitActivityFilters({
        ...DEFAULT_VISIT_ACTIVITY_FILTERS,
        result: "order",
      }),
    ).toBe(true);
  });
});

describe("countAdvancedVisitActivityFilters", () => {
  it("ignores period, search, and sort", () => {
    expect(
      countAdvancedVisitActivityFilters({
        ...DEFAULT_VISIT_ACTIVITY_FILTERS,
        period: "today",
        q: "f7",
        sort: "dealer",
      }),
    ).toBe(0);
  });

  it("counts each advanced filter once", () => {
    expect(
      countAdvancedVisitActivityFilters({
        ...DEFAULT_VISIT_ACTIVITY_FILTERS,
        salesman: "11111111-1111-4111-8111-111111111111",
        state: "Gujarat",
        city: "Surat",
        result: "order",
        dealerType: "new",
        followup: "overdue",
      }),
    ).toBe(6);
  });
});

describe("clearAdvancedVisitActivityFilters", () => {
  it("clears advanced filters and preserves period, search, sort", () => {
    const cleared = clearAdvancedVisitActivityFilters({
      ...DEFAULT_VISIT_ACTIVITY_FILTERS,
      period: "week",
      q: "rahul",
      sort: "salesman",
      page: 3,
      salesman: "11111111-1111-4111-8111-111111111111",
      state: "Gujarat",
      city: "Surat",
      result: "order",
      dealerType: "new",
      followup: "overdue",
    });

    expect(cleared).toEqual({
      ...DEFAULT_VISIT_ACTIVITY_FILTERS,
      period: "week",
      q: "rahul",
      sort: "salesman",
      page: 1,
    });
  });
});
