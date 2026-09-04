import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  CallOutcome,
  CreateFollowupFromVisitParams,
  CreateFollowupFromVisitResult,
  FollowupDueBucket,
  FollowupsSummary,
  GroupedFollowups,
  RecordFollowupOutcomeParams,
  RecordFollowupOutcomeResult,
  SalesmanFollowupItem,
} from "@/lib/types/followups";
import { buildTelLink } from "@/lib/utils/visit-history-format";

type DbClient = SupabaseClient<Database>;

interface DealerPhoneInput {
  phone_number: string | null;
  whatsapp_number: string | null;
}

interface DealerContactPhone {
  phone_number: string | null;
}

interface RawOrderLine {
  product_name: string;
  line_number: number;
}

interface RawFollowupRow {
  id: string;
  description: string;
  due_date: string;
  priority: Database["public"]["Enums"]["priority_level"];
  status: Database["public"]["Enums"]["followup_status"];
  dealer_id: string;
  created_from_visit_id: string | null;
  dealer: (DealerPhoneInput & {
    business_name: string;
    city: string | null;
    dealer_contacts: DealerContactPhone[] | null;
  }) | (DealerPhoneInput & {
    business_name: string;
    city: string | null;
    dealer_contacts: DealerContactPhone[] | null;
  })[] | null;
  visit: { visit_order_items: RawOrderLine[] | null } | { visit_order_items: RawOrderLine[] | null }[] | null;
}

function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function deriveFollowupDueBucket(
  dueDate: string,
  status: Database["public"]["Enums"]["followup_status"],
  now: Date = new Date(),
): FollowupDueBucket | null {
  if (status !== "pending") return null;

  const due = startOfDay(parseLocalDateString(dueDate));
  const today = startOfDay(now);

  if (due < today) return "overdue";
  if (due.getTime() === today.getTime()) return "due_today";
  return "upcoming";
}

export function resolveDealerCallPhone(
  dealer: DealerPhoneInput,
  contacts: DealerContactPhone[] = [],
): { phone: string | null; telLink: string | null } {
  const candidates = [
    dealer.phone_number,
    dealer.whatsapp_number,
    ...contacts.map((c) => c.phone_number),
  ];

  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const telLink = buildTelLink(trimmed);
    if (telLink) {
      return { phone: trimmed, telLink };
    }
  }

  return { phone: null, telLink: null };
}

export function buildNextFollowupDraft(
  outcome: CallOutcome,
  originalDescription: string,
): { description: string; requiresNextDate: boolean; allowsNextDate: boolean } {
  switch (outcome) {
    case "call_again":
      return { description: "Call dealer", requiresNextDate: true, allowsNextDate: true };
    case "send_quotation":
      return { description: "Send quotation", requiresNextDate: true, allowsNextDate: true };
    case "no_answer":
      return { description: "Call dealer — no answer", requiresNextDate: true, allowsNextDate: true };
    case "not_interested":
      return { description: originalDescription, requiresNextDate: false, allowsNextDate: false };
    case "interested":
      return {
        description: "Follow up on interest",
        requiresNextDate: false,
        allowsNextDate: true,
      };
  }
}

export function groupFollowupsByDue(items: SalesmanFollowupItem[]): GroupedFollowups {
  const overdue: SalesmanFollowupItem[] = [];
  const dueToday: SalesmanFollowupItem[] = [];
  const upcoming: SalesmanFollowupItem[] = [];

  for (const item of items) {
    if (item.dueBucket === "overdue") overdue.push(item);
    else if (item.dueBucket === "due_today") dueToday.push(item);
    else upcoming.push(item);
  }

  const byDueDate = (a: SalesmanFollowupItem, b: SalesmanFollowupItem) =>
    a.dueDate.localeCompare(b.dueDate);

  overdue.sort(byDueDate);
  dueToday.sort(byDueDate);
  upcoming.sort(byDueDate);

  return { overdue, dueToday, upcoming };
}

export function computeFollowupsSummary(grouped: GroupedFollowups): FollowupsSummary {
  return {
    overdue: grouped.overdue.length,
    dueToday: grouped.dueToday.length,
    upcoming: grouped.upcoming.length,
    total: grouped.overdue.length + grouped.dueToday.length + grouped.upcoming.length,
  };
}

function extractProductContext(
  visit: RawFollowupRow["visit"],
): string | null {
  const visitRow = unwrapOne(visit);
  const lines = visitRow?.visit_order_items ?? [];
  if (lines.length === 0) return null;
  const sorted = [...lines].sort((a, b) => a.line_number - b.line_number);
  return sorted[0]?.product_name ?? null;
}

function mapFollowupRow(row: RawFollowupRow, now: Date): SalesmanFollowupItem | null {
  const dealer = unwrapOne(row.dealer);
  if (!dealer) return null;

  const bucket = deriveFollowupDueBucket(row.due_date, row.status, now);
  if (!bucket) return null;

  const contacts = dealer.dealer_contacts ?? [];
  const { phone, telLink } = resolveDealerCallPhone(dealer, contacts);

  return {
    id: row.id,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    dealerId: row.dealer_id,
    dealerName: dealer.business_name,
    city: dealer.city,
    dealerPhone: phone,
    telLink,
    productContext: extractProductContext(row.visit),
    createdFromVisitId: row.created_from_visit_id,
    dueBucket: bucket,
  };
}

const FOLLOWUP_SELECT = `
  id,
  description,
  due_date,
  priority,
  status,
  dealer_id,
  created_from_visit_id,
  dealer:dealers (
    business_name,
    phone_number,
    whatsapp_number,
    city,
    dealer_contacts ( phone_number )
  ),
  visit:visits!followups_created_from_visit_id_fkey (
    visit_order_items ( product_name, line_number )
  )
`;

/** Count of open (pending) follow-ups for nav badge — head-only, no row payload. */
export async function countSalesmanScheduledFollowups(
  supabase: DbClient,
  salesmanId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("followups")
    .select("id", { count: "exact", head: true })
    .eq("salesman_id", salesmanId)
    .eq("status", "pending");

  if (error) {
    console.error("[followups] scheduled count failed", error);
    return 0;
  }

  return count ?? 0;
}

export async function listSalesmanFollowups(
  supabase: DbClient,
  salesmanId: string,
  now: Date = new Date(),
): Promise<{ items: SalesmanFollowupItem[]; grouped: GroupedFollowups; summary: FollowupsSummary }> {
  const { data, error } = await supabase
    .from("followups")
    .select(FOLLOWUP_SELECT)
    .eq("salesman_id", salesmanId)
    .eq("status", "pending")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("[followups] list failed", error);
    throw new Error("Could not load follow-ups.");
  }

  const items = (data as RawFollowupRow[])
    .map((row) => mapFollowupRow(row, now))
    .filter((item): item is SalesmanFollowupItem => item !== null);

  const grouped = groupFollowupsByDue(items);
  const summary = computeFollowupsSummary(grouped);

  return { items, grouped, summary };
}

async function findChildFollowup(
  supabase: DbClient,
  parentFollowupId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("followups")
    .select("id")
    .eq("parent_followup_id", parentFollowupId)
    .maybeSingle();

  return data?.id ?? null;
}

async function findRootFollowupForVisit(
  supabase: DbClient,
  visitId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("followups")
    .select("id")
    .eq("created_from_visit_id", visitId)
    .is("parent_followup_id", null)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * Create the optional root follow-up linked to a newly recorded visit.
 * Idempotent for one root follow-up per visit (parent_followup_id IS NULL).
 */
export async function createFollowupFromVisit(
  supabase: DbClient,
  params: CreateFollowupFromVisitParams,
): Promise<CreateFollowupFromVisitResult> {
  const { userId, salesmanId, dealerId, visitId, description, dueDate } = params;

  const trimmedDescription = description.trim();
  if (!trimmedDescription) {
    return { success: false, error: "Follow-up description is required." };
  }

  if (!dueDate) {
    return { success: false, error: "Follow-up due date is required." };
  }

  const existingId = await findRootFollowupForVisit(supabase, visitId);
  if (existingId) {
    return { success: true, followupId: existingId, alreadyExisted: true };
  }

  const { data: created, error: insertError } = await supabase
    .from("followups")
    .insert({
      dealer_id: dealerId,
      salesman_id: salesmanId,
      description: trimmedDescription,
      due_date: dueDate,
      priority: "medium",
      status: "pending",
      source: "web",
      created_from_visit_id: visitId,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      const racedId = await findRootFollowupForVisit(supabase, visitId);
      if (racedId) {
        return { success: true, followupId: racedId, alreadyExisted: true };
      }
    }
    console.error("[followups] create from visit failed", insertError);
    return {
      success: false,
      error: "Visit saved, but the follow-up could not be created. Open Follow-ups or try again.",
    };
  }

  if (!created?.id) {
    return {
      success: false,
      error: "Visit saved, but the follow-up could not be created. Open Follow-ups or try again.",
    };
  }

  return { success: true, followupId: created.id };
}

export async function recordFollowupOutcome(
  supabase: DbClient,
  params: RecordFollowupOutcomeParams,
): Promise<RecordFollowupOutcomeResult> {
  const { followupId, salesmanId, userId, outcome, note, nextDueDate } = params;

  const { data: existing, error: loadError } = await supabase
    .from("followups")
    .select("id, status, salesman_id, dealer_id, priority, description, created_from_visit_id, outcome")
    .eq("id", followupId)
    .maybeSingle();

  if (loadError || !existing) {
    return { success: false, error: "Follow-up not found.", followupId };
  }

  if (existing.salesman_id !== salesmanId) {
    return { success: false, error: "You are not allowed to update this follow-up.", followupId };
  }

  if (existing.status === "completed") {
    const childId = await findChildFollowup(supabase, followupId);
    return {
      success: true,
      followupId,
      nextFollowupId: childId ?? undefined,
      alreadyCompleted: true,
    };
  }

  if (existing.status !== "pending") {
    return { success: false, error: "This follow-up can no longer be updated.", followupId };
  }

  const draft = buildNextFollowupDraft(outcome, existing.description);
  const shouldCreateNext =
    draft.requiresNextDate || (draft.allowsNextDate && nextDueDate !== undefined);

  if (draft.requiresNextDate && !nextDueDate) {
    return { success: false, error: "Please choose when to follow up next.", followupId };
  }

  if (outcome === "not_interested" && nextDueDate) {
    return { success: false, error: "No next follow-up is needed for this outcome.", followupId };
  }

  const completedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("followups")
    .update({
      status: "completed",
      outcome,
      completion_notes: note?.trim() || null,
      completed_at: completedAt,
    })
    .eq("id", followupId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[followups] complete failed", updateError);
    return { success: false, error: "Could not save call outcome.", followupId };
  }

  if (!updated) {
    const childId = await findChildFollowup(supabase, followupId);
    return {
      success: true,
      followupId,
      nextFollowupId: childId ?? undefined,
      alreadyCompleted: true,
    };
  }

  if (!shouldCreateNext || !nextDueDate) {
    return { success: true, followupId };
  }

  const existingChildId = await findChildFollowup(supabase, followupId);
  if (existingChildId) {
    return { success: true, followupId, nextFollowupId: existingChildId };
  }

  const { data: created, error: insertError } = await supabase
    .from("followups")
    .insert({
      dealer_id: existing.dealer_id,
      salesman_id: existing.salesman_id,
      description: draft.description,
      due_date: nextDueDate,
      priority: existing.priority,
      status: "pending",
      source: "web",
      created_from_visit_id: existing.created_from_visit_id,
      parent_followup_id: followupId,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    if (insertError.code === "23505") {
      const childId = await findChildFollowup(supabase, followupId);
      if (childId) {
        return { success: true, followupId, nextFollowupId: childId };
      }
    }
    console.error("[followups] create next failed", insertError);
    return {
      success: false,
      error: "Call recorded, but the next follow-up could not be created. Try again.",
      followupId,
    };
  }

  return { success: true, followupId, nextFollowupId: created?.id };
}
