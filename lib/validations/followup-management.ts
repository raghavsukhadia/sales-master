import { z } from "zod";
import {
  DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS,
  type FollowupManagementFilters,
  type FollowupManagementOutcomeFilter,
  type FollowupManagementPriorityFilter,
  type FollowupManagementSortOption,
  type FollowupManagementStatusTab,
} from "@/lib/types/followup-management";
import type { CallOutcome } from "@/lib/types/followups";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_TABS = [
  "all",
  "overdue",
  "due_today",
  "upcoming",
  "completed",
] as const satisfies readonly FollowupManagementStatusTab[];

const PRIORITIES = [
  "all",
  "low",
  "medium",
  "high",
] as const satisfies readonly FollowupManagementPriorityFilter[];

const OUTCOMES = [
  "all",
  "interested",
  "call_again",
  "send_quotation",
  "no_answer",
  "not_interested",
] as const satisfies readonly FollowupManagementOutcomeFilter[];

const SORTS = [
  "due",
  "newest",
  "oldest",
  "priority",
  "salesman",
] as const satisfies readonly FollowupManagementSortOption[];

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

export function parseFollowupManagementSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): FollowupManagementFilters {
  const get = (key: string): string | undefined => {
    if (params instanceof URLSearchParams) {
      return params.get(key) ?? undefined;
    }
    const raw = params[key];
    if (Array.isArray(raw)) return raw[0];
    return raw;
  };

  const status = oneOf(get("status"), STATUS_TABS, DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS.status);
  const priority = oneOf(get("priority"), PRIORITIES, DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS.priority);
  const outcome = oneOf(get("outcome"), OUTCOMES, DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS.outcome);
  const sort = oneOf(get("sort"), SORTS, DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS.sort);

  const dueFromRaw = optionalTrimmed(get("dueFrom"));
  const dueToRaw = optionalTrimmed(get("dueTo"));
  const dueFrom = dueFromRaw && DATE_PATTERN.test(dueFromRaw) ? dueFromRaw : undefined;
  const dueTo = dueToRaw && DATE_PATTERN.test(dueToRaw) ? dueToRaw : undefined;

  const salesmanRaw = optionalTrimmed(get("salesman"));
  const salesman = salesmanRaw && UUID_PATTERN.test(salesmanRaw) ? salesmanRaw : undefined;

  const state = optionalTrimmed(get("state"));
  const city = optionalTrimmed(get("city"));
  const q = optionalTrimmed(get("q")) ?? optionalTrimmed(get("search"));

  const pageRaw = Number.parseInt(get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const filters: FollowupManagementFilters = {
    status,
    priority,
    outcome,
    sort,
    page,
  };

  if (salesman) filters.salesman = salesman;
  if (state) filters.state = state;
  if (city) filters.city = city;
  if (q) filters.q = q;
  if (dueFrom) filters.dueFrom = dueFrom;
  if (dueTo) filters.dueTo = dueTo;

  return filters;
}

export function followupManagementFiltersToParams(
  filters: FollowupManagementFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.status !== DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS.status) {
    params.set("status", filters.status);
  }
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.salesman) params.set("salesman", filters.salesman);
  if (filters.state) params.set("state", filters.state);
  if (filters.city) params.set("city", filters.city);
  if (filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.outcome !== "all") params.set("outcome", filters.outcome);
  if (filters.dueFrom) params.set("dueFrom", filters.dueFrom);
  if (filters.dueTo) params.set("dueTo", filters.dueTo);
  if (filters.sort !== DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS.sort) {
    params.set("sort", filters.sort);
  }
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

export function countAdvancedFollowupManagementFilters(
  filters: FollowupManagementFilters,
): number {
  let count = 0;
  if (filters.salesman) count += 1;
  if (filters.state) count += 1;
  if (filters.city) count += 1;
  if (filters.priority !== "all") count += 1;
  if (filters.outcome !== "all") count += 1;
  if (filters.dueFrom) count += 1;
  if (filters.dueTo) count += 1;
  return count;
}

export function clearAdvancedFollowupManagementFilters(
  filters: FollowupManagementFilters,
): FollowupManagementFilters {
  return {
    ...filters,
    salesman: undefined,
    state: undefined,
    city: undefined,
    priority: "all",
    outcome: "all",
    dueFrom: undefined,
    dueTo: undefined,
    page: 1,
  };
}

export function hasActiveFollowupManagementFilters(filters: FollowupManagementFilters): boolean {
  return (
    Boolean(filters.q?.trim()) ||
    countAdvancedFollowupManagementFilters(filters) > 0 ||
    filters.status !== DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS.status ||
    filters.sort !== DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS.sort
  );
}

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  interested: "Interested",
  call_again: "Call again",
  send_quotation: "Send quotation",
  no_answer: "No answer",
  not_interested: "Not interested",
};

export const followupManagementFiltersSchema = z.object({
  status: z.enum(STATUS_TABS),
  q: z.string().trim().max(200).optional(),
  salesman: z.string().uuid().optional(),
  state: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  priority: z.enum(PRIORITIES),
  outcome: z.enum(OUTCOMES),
  dueFrom: z.string().regex(DATE_PATTERN).optional(),
  dueTo: z.string().regex(DATE_PATTERN).optional(),
  sort: z.enum(SORTS),
  page: z.number().int().min(1),
});
