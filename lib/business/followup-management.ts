import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { deriveFollowupDueBucket } from "@/lib/business/followups";
import type { CallOutcome } from "@/lib/types/followups";
import type {
  FollowupDisplayStatus,
  FollowupLastAction,
  FollowupManagementDetail,
  FollowupManagementFilterOptions,
  FollowupManagementFilters,
  FollowupManagementItem,
  FollowupManagementListResult,
  FollowupManagementSortOption,
  FollowupManagementSummary,
  FollowupTimelineEvent,
} from "@/lib/types/followup-management";
import { FOLLOWUP_MANAGEMENT_PAGE_SIZE } from "@/lib/types/followup-management";
import { OUTCOME_LABELS } from "@/lib/validations/followup-management";

type DbClient = SupabaseClient<Database>;

interface RawOrderLine {
  product_name: string;
  line_number: number;
}

interface RawParent {
  id: string;
  description: string;
  outcome: CallOutcome | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
}

interface RawChild {
  id: string;
  description: string;
  due_date: string;
  created_at: string;
}

interface RawDealer {
  id: string;
  business_name: string;
  phone_number: string | null;
  city: string | null;
  state: string | null;
}

interface RawVisit {
  id: string;
  visit_date: string;
  visit_order_items: RawOrderLine[] | null;
}

interface RawFollowupRow {
  id: string;
  description: string;
  due_date: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "cancelled";
  dealer_id: string;
  salesman_id: string;
  created_from_visit_id: string | null;
  parent_followup_id: string | null;
  outcome: CallOutcome | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
  dealer: RawDealer | RawDealer[] | null;
  salesman: { full_name: string } | { full_name: string }[] | null;
  visit: RawVisit | RawVisit[] | null;
  parent: RawParent | RawParent[] | null;
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function extractProductContext(visit: RawVisit | null): string | null {
  const lines = visit?.visit_order_items ?? [];
  if (lines.length === 0) return null;
  const sorted = [...lines].sort((a, b) => a.line_number - b.line_number);
  return sorted[0]?.product_name ?? null;
}

export function deriveLastAction(input: {
  status: "pending" | "completed" | "cancelled";
  outcome: CallOutcome | null;
  completedAt: string | null;
  completionNotes: string | null;
  parent: Pick<RawParent, "outcome" | "completed_at" | "completion_notes"> | null;
}): FollowupLastAction {
  if (input.status === "completed" && input.outcome) {
    return {
      label: OUTCOME_LABELS[input.outcome],
      outcome: input.outcome,
      at: input.completedAt,
      notes: input.completionNotes,
    };
  }

  if (input.parent?.outcome) {
    return {
      label: OUTCOME_LABELS[input.parent.outcome],
      outcome: input.parent.outcome,
      at: input.parent.completed_at,
      notes: input.parent.completion_notes,
    };
  }

  return {
    label: "No action recorded",
    outcome: null,
    at: null,
    notes: null,
  };
}

export function deriveAttention(input: {
  status: "pending" | "completed" | "cancelled";
  displayStatus: FollowupDisplayStatus;
  priority: "low" | "medium" | "high";
  parentFollowupId: string | null;
  outcome: CallOutcome | null;
  hasChild: boolean;
}): { needsAttention: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (input.status === "pending" && input.displayStatus === "overdue") {
    reasons.push("Overdue");
    if (input.priority === "high") {
      reasons.push("High priority overdue");
    }
    if (!input.parentFollowupId) {
      reasons.push("No prior outcome");
    }
  }

  if (input.status === "completed" && !input.outcome) {
    reasons.push("Completed without outcome");
  }

  if (input.status === "completed" && input.outcome === "interested" && !input.hasChild) {
    reasons.push("Interested without next follow-up");
  }

  return { needsAttention: reasons.length > 0, reasons };
}

export function computeFollowupManagementSummary(
  items: FollowupManagementItem[],
): FollowupManagementSummary {
  return {
    overdue: items.filter((i) => i.displayStatus === "overdue").length,
    dueToday: items.filter((i) => i.displayStatus === "due_today").length,
    upcoming: items.filter((i) => i.displayStatus === "upcoming").length,
    completed: items.filter((i) => i.status === "completed").length,
    noResponse: items.filter(
      (i) => i.status === "completed" && i.outcome === "no_answer",
    ).length,
  };
}

const PRIORITY_RANK: Record<"low" | "medium" | "high", number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortFollowupManagementItems(
  items: FollowupManagementItem[],
  sort: FollowupManagementSortOption,
): FollowupManagementItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "priority": {
        const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (rank !== 0) return rank;
        return a.dueDate.localeCompare(b.dueDate);
      }
      case "salesman": {
        const nameCmp = a.salesmanName.localeCompare(b.salesmanName, undefined, {
          sensitivity: "base",
        });
        if (nameCmp !== 0) return nameCmp;
        return a.dueDate.localeCompare(b.dueDate);
      }
      case "due":
      default: {
        // Pending before completed; then by due date ascending.
        if (a.status !== b.status) {
          return a.status === "pending" ? -1 : 1;
        }
        if (a.status === "completed" && b.status === "completed") {
          const aAt = a.completedAt ?? a.createdAt;
          const bAt = b.completedAt ?? b.createdAt;
          return new Date(bAt).getTime() - new Date(aAt).getTime();
        }
        return a.dueDate.localeCompare(b.dueDate);
      }
    }
  });

  return sorted;
}

export function paginateFollowupManagementItems<T>(
  items: T[],
  page: number,
  pageSize: number = FOLLOWUP_MANAGEMENT_PAGE_SIZE,
): { pageItems: T[]; page: number; totalPages: number; totalCount: number } {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalCount,
  };
}

export function buildFollowupTimeline(input: {
  item: FollowupManagementItem;
  parent: RawParent | null;
  child: RawChild | null;
  visitDate: string | null;
}): FollowupTimelineEvent[] {
  const events: FollowupTimelineEvent[] = [];

  if (input.visitDate && input.item.createdFromVisitId) {
    events.push({
      id: `visit-${input.item.createdFromVisitId}`,
      at: input.visitDate,
      title: `Dealer visited by ${input.item.salesmanName}`,
      detail: input.item.productContext
        ? `${input.item.productContext} discussed`
        : null,
    });
  }

  if (input.parent) {
    events.push({
      id: `parent-created-${input.parent.id}`,
      at: input.parent.created_at,
      title: "Earlier follow-up created",
      detail: input.parent.description,
    });
    if (input.parent.outcome && input.parent.completed_at) {
      events.push({
        id: `parent-completed-${input.parent.id}`,
        at: input.parent.completed_at,
        title: `Outcome: ${OUTCOME_LABELS[input.parent.outcome]}`,
        detail: input.parent.completion_notes,
      });
    }
  }

  events.push({
    id: `created-${input.item.id}`,
    at: input.item.createdAt,
    title: "Follow-up created",
    detail: `${input.item.description} · Due ${input.item.dueDate}`,
  });

  if (input.item.status === "completed" && input.item.outcome && input.item.completedAt) {
    events.push({
      id: `completed-${input.item.id}`,
      at: input.item.completedAt,
      title: `Outcome: ${OUTCOME_LABELS[input.item.outcome]}`,
      detail: input.item.completionNotes,
    });
  }

  if (input.child) {
    events.push({
      id: `child-${input.child.id}`,
      at: input.child.created_at,
      title: "Next follow-up scheduled",
      detail: `${input.child.description} · Due ${input.child.due_date}`,
    });
  }

  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function mapDisplayStatus(
  status: "pending" | "completed" | "cancelled",
  dueDate: string,
  now: Date,
): FollowupDisplayStatus | null {
  if (status === "cancelled") return null;
  if (status === "completed") return "completed";
  const bucket = deriveFollowupDueBucket(dueDate, status, now);
  return bucket;
}

function mapRow(
  row: RawFollowupRow,
  childByParentId: Map<string, RawChild>,
  now: Date,
): FollowupManagementItem | null {
  const displayStatus = mapDisplayStatus(row.status, row.due_date, now);
  if (!displayStatus) return null;
  if (row.status === "cancelled") return null;

  const dealer = unwrapOne(row.dealer);
  const salesman = unwrapOne(row.salesman);
  const visit = unwrapOne(row.visit);
  const parent = unwrapOne(row.parent);
  const child = childByParentId.get(row.id) ?? null;

  const lastAction = deriveLastAction({
    status: row.status,
    outcome: row.outcome,
    completedAt: row.completed_at,
    completionNotes: row.completion_notes,
    parent,
  });

  const attention = deriveAttention({
    status: row.status,
    displayStatus,
    priority: row.priority,
    parentFollowupId: row.parent_followup_id,
    outcome: row.outcome,
    hasChild: Boolean(child),
  });

  const nextDescription =
    row.status === "completed"
      ? (child?.description ?? null)
      : row.description;
  const nextDueDate =
    row.status === "completed" ? (child?.due_date ?? null) : row.due_date;

  return {
    id: row.id,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status === "completed" ? "completed" : "pending",
    displayStatus,
    dealerId: row.dealer_id,
    dealerName: dealer?.business_name ?? "Unknown dealer",
    dealerPhone: dealer?.phone_number ?? null,
    city: dealer?.city ?? null,
    state: dealer?.state ?? null,
    salesmanId: row.salesman_id,
    salesmanName: salesman?.full_name ?? "Unknown salesman",
    productContext: extractProductContext(visit),
    createdFromVisitId: row.created_from_visit_id,
    parentFollowupId: row.parent_followup_id,
    outcome: row.outcome,
    completedAt: row.completed_at,
    completionNotes: row.completion_notes,
    createdAt: row.created_at,
    lastAction,
    needsAttention: attention.needsAttention,
    attentionReasons: attention.reasons,
    nextDescription,
    nextDueDate,
  };
}

function recordedOutcome(item: FollowupManagementItem): CallOutcome | null {
  if (item.status === "completed") return item.outcome;
  return item.lastAction.outcome;
}

function matchesSearch(item: FollowupManagementItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.dealerName,
    item.dealerPhone,
    item.salesmanName,
    item.description,
    item.city,
    item.state,
    item.productContext,
    item.lastAction.label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function applyFilters(
  items: FollowupManagementItem[],
  filters: FollowupManagementFilters,
): FollowupManagementItem[] {
  return items.filter((item) => {
    if (filters.status === "overdue" && item.displayStatus !== "overdue") return false;
    if (filters.status === "due_today" && item.displayStatus !== "due_today") return false;
    if (filters.status === "upcoming" && item.displayStatus !== "upcoming") return false;
    if (filters.status === "completed" && item.status !== "completed") return false;

    if (filters.priority !== "all" && item.priority !== filters.priority) return false;

    if (filters.outcome !== "all") {
      const outcome = recordedOutcome(item);
      if (outcome !== filters.outcome) return false;
    }

    if (filters.q && !matchesSearch(item, filters.q)) return false;

    return true;
  });
}

const FOLLOWUP_SELECT = `
  id,
  description,
  due_date,
  priority,
  status,
  dealer_id,
  salesman_id,
  created_from_visit_id,
  parent_followup_id,
  outcome,
  completed_at,
  completion_notes,
  created_at,
  dealer:dealers!inner (
    id,
    business_name,
    phone_number,
    city,
    state
  ),
  salesman:salesmen (
    full_name
  ),
  visit:visits!followups_created_from_visit_id_fkey (
    id,
    visit_date,
    visit_order_items ( product_name, line_number )
  ),
  parent:followups!parent_followup_id (
    id,
    description,
    outcome,
    completed_at,
    completion_notes,
    created_at
  )
`;

async function loadFilterOptions(supabase: DbClient): Promise<FollowupManagementFilterOptions> {
  const [salesmenResult, dealersResult] = await Promise.all([
    supabase
      .from("salesmen")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("dealers")
      .select("city, state")
      .not("city", "is", null)
      .order("state")
      .order("city"),
  ]);

  if (salesmenResult.error) {
    console.error("[followup-management] salesmen options failed", salesmenResult.error);
  }
  if (dealersResult.error) {
    console.error("[followup-management] location options failed", dealersResult.error);
  }

  const salesmen = (salesmenResult.data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
  }));

  const byState = new Map<string, Set<string>>();
  for (const row of dealersResult.data ?? []) {
    const state = row.state?.trim();
    const city = row.city?.trim();
    if (!state || !city) continue;
    if (!byState.has(state)) byState.set(state, new Set());
    byState.get(state)!.add(city);
  }

  const locations = [...byState.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, cities]) => ({
      state,
      cities: [...cities].sort((a, b) => a.localeCompare(b)),
    }));

  return { salesmen, locations };
}

async function loadChildrenByParentIds(
  supabase: DbClient,
  parentIds: string[],
): Promise<Map<string, RawChild>> {
  const map = new Map<string, RawChild>();
  if (parentIds.length === 0) return map;

  const { data, error } = await supabase
    .from("followups")
    .select("id, description, due_date, created_at, parent_followup_id")
    .in("parent_followup_id", parentIds);

  if (error) {
    console.error("[followup-management] children lookup failed", error);
    return map;
  }

  for (const row of data ?? []) {
    if (!row.parent_followup_id) continue;
    map.set(row.parent_followup_id, {
      id: row.id,
      description: row.description,
      due_date: row.due_date,
      created_at: row.created_at,
    });
  }

  return map;
}

export async function listFollowupsForAdmin(
  supabase: DbClient,
  filters: FollowupManagementFilters,
  now: Date = new Date(),
): Promise<FollowupManagementListResult> {
  const filterOptions = await loadFilterOptions(supabase);

  let query = supabase
    .from("followups")
    .select(FOLLOWUP_SELECT)
    .neq("status", "cancelled")
    .order("due_date", { ascending: true });

  if (filters.salesman) {
    query = query.eq("salesman_id", filters.salesman);
  }
  if (filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters.state) {
    query = query.eq("dealer.state", filters.state);
  }
  if (filters.city) {
    query = query.eq("dealer.city", filters.city);
  }
  if (filters.dueFrom) {
    query = query.gte("due_date", filters.dueFrom);
  }
  if (filters.dueTo) {
    query = query.lte("due_date", filters.dueTo);
  }

  const result = await query;

  if (result.error) {
    console.error("[followup-management] list failed", result.error);
    throw new Error("Could not load follow-ups.");
  }

  const rows = (result.data ?? []) as unknown as RawFollowupRow[];
  const parentIds = rows.map((r) => r.id);
  const childByParentId = await loadChildrenByParentIds(supabase, parentIds);

  const mapped = rows
    .map((row) => mapRow(row, childByParentId, now))
    .filter((item): item is FollowupManagementItem => item !== null);

  const filtered = applyFilters(mapped, filters);
  const summary = computeFollowupManagementSummary(filtered);
  const sorted = sortFollowupManagementItems(filtered, filters.sort);
  const { pageItems, page, totalPages, totalCount } = paginateFollowupManagementItems(
    sorted,
    filters.page,
  );

  return {
    items: pageItems,
    summary,
    totalCount,
    page,
    pageSize: FOLLOWUP_MANAGEMENT_PAGE_SIZE,
    totalPages,
    filterOptions,
  };
}

export async function getFollowupDetailForAdmin(
  supabase: DbClient,
  followupId: string,
  now: Date = new Date(),
): Promise<FollowupManagementDetail | null> {
  const { data, error } = await supabase
    .from("followups")
    .select(FOLLOWUP_SELECT)
    .eq("id", followupId)
    .maybeSingle();

  if (error) {
    console.error("[followup-management] detail failed", error);
    throw new Error("Could not load follow-up details.");
  }

  if (!data) return null;

  const row = data as unknown as RawFollowupRow;
  const childByParentId = await loadChildrenByParentIds(supabase, [row.id]);
  const item = mapRow(row, childByParentId, now);
  if (!item) return null;

  const parent = unwrapOne(row.parent);
  const child = childByParentId.get(row.id) ?? null;
  const visit = unwrapOne(row.visit);

  return {
    ...item,
    visitDate: visit?.visit_date ?? null,
    timeline: buildFollowupTimeline({
      item,
      parent,
      child,
      visitDate: visit?.visit_date ?? null,
    }),
  };
}
