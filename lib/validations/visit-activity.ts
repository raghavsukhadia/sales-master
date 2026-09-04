import { z } from "zod";
import {
  DEFAULT_VISIT_ACTIVITY_FILTERS,
  type VisitActivityFilters,
  type VisitActivityFollowUpFilter,
  type VisitActivityPeriod,
  type VisitActivityResultFilter,
  type VisitActivitySortOption,
} from "@/lib/types/visit-activity";
import type { DealerTypeFilter } from "@/lib/types/visit-history";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PERIODS = ["today", "week", "month", "custom"] as const satisfies readonly VisitActivityPeriod[];
const RESULTS = ["all", "order", "no_order"] as const satisfies readonly VisitActivityResultFilter[];
const DEALER_TYPES = ["all", "new", "existing"] as const satisfies readonly DealerTypeFilter[];
const FOLLOWUPS = [
  "all",
  "scheduled",
  "none",
  "due_today",
  "overdue",
  "completed",
] as const satisfies readonly VisitActivityFollowUpFilter[];
const SORTS = [
  "newest",
  "oldest",
  "salesman",
  "dealer",
  "result",
] as const satisfies readonly VisitActivitySortOption[];

function oneOf<T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T {
  if (value && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  return fallback;
}

function optionalTrimmed(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Parse and validate admin Visit Activity URL search params.
 * Unknown / invalid enum values fall back to defaults (never trust raw query strings).
 */
export function parseVisitActivitySearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): VisitActivityFilters {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const raw = params[key];
    if (Array.isArray(raw)) return raw[0];
    return raw;
  };

  const period = oneOf(get("period"), PERIODS, DEFAULT_VISIT_ACTIVITY_FILTERS.period);
  const result = oneOf(get("result"), RESULTS, DEFAULT_VISIT_ACTIVITY_FILTERS.result);
  const dealerType = oneOf(get("dealerType"), DEALER_TYPES, DEFAULT_VISIT_ACTIVITY_FILTERS.dealerType);
  const followup = oneOf(get("followup"), FOLLOWUPS, DEFAULT_VISIT_ACTIVITY_FILTERS.followup);
  const sort = oneOf(get("sort"), SORTS, DEFAULT_VISIT_ACTIVITY_FILTERS.sort);

  const fromRaw = optionalTrimmed(get("from"));
  const toRaw = optionalTrimmed(get("to"));
  const from = fromRaw && DATE_PATTERN.test(fromRaw) ? fromRaw : undefined;
  const to = toRaw && DATE_PATTERN.test(toRaw) ? toRaw : undefined;

  const salesmanRaw = optionalTrimmed(get("salesman"));
  const salesman = salesmanRaw && UUID_PATTERN.test(salesmanRaw) ? salesmanRaw : undefined;

  const state = optionalTrimmed(get("state"));
  const city = optionalTrimmed(get("city"));
  const q = optionalTrimmed(get("q")) ?? optionalTrimmed(get("search"));

  const pageRaw = Number.parseInt(get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const filters: VisitActivityFilters = {
    period,
    result,
    dealerType,
    followup,
    sort,
    page,
  };

  if (period === "custom") {
    if (from) filters.from = from;
    if (to) filters.to = to;
  }

  if (salesman) filters.salesman = salesman;
  if (state) filters.state = state;
  if (city) filters.city = city;
  if (q) filters.q = q;

  return filters;
}

/** Serialize filters to URLSearchParams, omitting defaults. */
export function visitActivityFiltersToParams(filters: VisitActivityFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.period !== DEFAULT_VISIT_ACTIVITY_FILTERS.period) {
    params.set("period", filters.period);
  }
  if (filters.period === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.salesman) params.set("salesman", filters.salesman);
  if (filters.state) params.set("state", filters.state);
  if (filters.city) params.set("city", filters.city);
  if (filters.result !== "all") params.set("result", filters.result);
  if (filters.dealerType !== "all") params.set("dealerType", filters.dealerType);
  if (filters.followup !== "all") params.set("followup", filters.followup);
  if (filters.sort !== DEFAULT_VISIT_ACTIVITY_FILTERS.sort) {
    params.set("sort", filters.sort);
  }
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

export function hasActiveVisitActivityFilters(filters: VisitActivityFilters): boolean {
  return (
    Boolean(filters.q?.trim()) ||
    countAdvancedVisitActivityFilters(filters) > 0 ||
    filters.period !== DEFAULT_VISIT_ACTIVITY_FILTERS.period ||
    filters.sort !== DEFAULT_VISIT_ACTIVITY_FILTERS.sort
  );
}

/** Count only advanced filters (not period, search, or sort). */
export function countAdvancedVisitActivityFilters(filters: VisitActivityFilters): number {
  let count = 0;
  if (filters.salesman) count += 1;
  if (filters.state) count += 1;
  if (filters.city) count += 1;
  if (filters.result !== "all") count += 1;
  if (filters.dealerType !== "all") count += 1;
  if (filters.followup !== "all") count += 1;
  return count;
}

/** Reset advanced filters only; preserve period, search, and sort. */
export function clearAdvancedVisitActivityFilters(
  filters: VisitActivityFilters,
): VisitActivityFilters {
  return {
    ...filters,
    salesman: undefined,
    state: undefined,
    city: undefined,
    result: "all",
    dealerType: "all",
    followup: "all",
    page: 1,
  };
}

/** Zod schema kept for tests / future form posts; URL parsing uses the tolerant helper above. */
export const visitActivityFiltersSchema = z.object({
  period: z.enum(PERIODS),
  from: z.string().regex(DATE_PATTERN).optional(),
  to: z.string().regex(DATE_PATTERN).optional(),
  q: z.string().trim().max(200).optional(),
  salesman: z.string().uuid().optional(),
  state: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  result: z.enum(RESULTS),
  dealerType: z.enum(DEALER_TYPES),
  followup: z.enum(FOLLOWUPS),
  sort: z.enum(SORTS),
  page: z.number().int().min(1),
});
