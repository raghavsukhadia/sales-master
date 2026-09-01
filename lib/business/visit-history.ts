import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  DateRangePreset,
  DealerTypeFilter,
  FollowUpFilter,
  OrderFilter,
  PreviousVisitSummary,
  VisitDealerType,
  VisitFollowUpStatus,
  VisitHistoryDetail,
  VisitHistoryFilters,
  VisitHistoryItem,
  VisitHistoryOrderItem,
  VisitHistorySummary,
} from "@/lib/types/visit-history";

export type VisitHistoryDetailCore = Omit<VisitHistoryDetail, "attachments">;

type DbClient = SupabaseClient<Database>;

interface RawFollowUp {
  id: string;
  description: string;
  due_date: string;
  status: Database["public"]["Enums"]["followup_status"];
}

interface RawOrderItem {
  product_name: string;
  product_id: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  line_number: number;
}

interface RawDealer {
  id: string;
  business_name: string;
  phone_number: string | null;
  whatsapp_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

interface RawVisitRow {
  id: string;
  visit_number: number;
  visit_date: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  dealer_id: string;
  salesman_id: string;
  dealer: RawDealer | RawDealer[] | null;
  visit_order_items: RawOrderItem[] | null;
  followups: RawFollowUp[] | RawFollowUp | null;
  salesman: { full_name: string } | { full_name: string }[] | null;
}

interface PriorVisitRef {
  dealer_id: string;
  visit_date: string;
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

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseLocalDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getDateRangeBounds(
  range: DateRangePreset,
  from?: string,
  to?: string,
  now: Date = new Date(),
): { from: Date; to: Date } {
  if (range === "custom" && from && to) {
    return { from: startOfDay(parseLocalDateString(from)), to: endOfDay(parseLocalDateString(to)) };
  }

  const end = endOfDay(now);

  if (range === "today") {
    return { from: startOfDay(now), to: end };
  }

  if (range === "week") {
    const start = startOfDay(now);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    return { from: start, to: end };
  }

  const start = startOfDay(now);
  start.setDate(1);
  return { from: start, to: end };
}

export function deriveFollowUpStatus(
  followUp: Pick<RawFollowUp, "due_date" | "status"> | null,
  now: Date = new Date(),
): VisitFollowUpStatus {
  if (!followUp) return "none";
  if (followUp.status === "completed") return "completed";
  if (followUp.status === "cancelled") return "none";

  const due = startOfDay(new Date(followUp.due_date));
  const today = startOfDay(now);
  if (due < today) return "overdue";
  return "pending";
}

export function deriveDealerType(
  visit: Pick<PriorVisitRef, "dealer_id" | "visit_date">,
  priorVisits: PriorVisitRef[],
): VisitDealerType {
  const visitTime = new Date(visit.visit_date).getTime();
  const hasEarlier = priorVisits.some(
    (prior) =>
      prior.dealer_id === visit.dealer_id && new Date(prior.visit_date).getTime() < visitTime,
  );
  return hasEarlier ? "existing" : "new";
}

export function computeSummary(items: VisitHistoryItem[]): VisitHistorySummary {
  return {
    totalVisits: items.length,
    ordersPlaced: items.filter((item) => item.orderPlaced).length,
    noOrder: items.filter((item) => !item.orderPlaced).length,
    pendingFollowUps: items.filter(
      (item) => item.followUpStatus === "pending" || item.followUpStatus === "overdue",
    ).length,
  };
}

function mapOrderItems(items: RawOrderItem[] | null | undefined): {
  items: VisitHistoryOrderItem[];
  orderValue: number | undefined;
  productCount: number;
  totalQuantity: number;
} {
  const rows = (items ?? []).slice().sort((a, b) => a.line_number - b.line_number);
  const mapped: VisitHistoryOrderItem[] = rows.map((row) => {
    const lineTotal = row.unit_price * row.quantity;
    return {
      productId: row.product_id,
      productName: row.product_name,
      quantity: row.quantity,
      unit: row.unit,
      price: row.unit_price > 0 ? row.unit_price : undefined,
      lineTotal: lineTotal > 0 ? lineTotal : undefined,
    };
  });

  const orderValue = mapped.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0);
  const totalQuantity = mapped.reduce((sum, row) => sum + row.quantity, 0);

  return {
    items: mapped,
    orderValue: orderValue > 0 ? orderValue : undefined,
    productCount: mapped.length,
    totalQuantity,
  };
}

function mapVisitRow(
  row: RawVisitRow,
  priorVisits: PriorVisitRef[],
): VisitHistoryItem {
  const dealer = unwrapOne(row.dealer);
  const followUp = unwrapOne(row.followups);
  const salesman = unwrapOne(row.salesman);
  const order = mapOrderItems(row.visit_order_items);
  const followUpStatus = deriveFollowUpStatus(followUp);

  return {
    id: row.id,
    visitNumber: row.visit_number ? `V-${row.visit_number}` : null,
    dealerId: row.dealer_id,
    dealerName: dealer?.business_name ?? "Unknown dealer",
    dealerPhone: dealer?.phone_number,
    dealerWhatsapp: dealer?.whatsapp_number,
    dealerType: deriveDealerType(row, priorVisits),
    city: dealer?.city,
    state: dealer?.state,
    area: null,
    visitedAt: row.visit_date,
    salespersonId: row.salesman_id,
    salespersonName: salesman?.full_name ?? null,
    orderPlaced: order.productCount > 0,
    items: order.items,
    productCount: order.productCount,
    totalQuantity: order.totalQuantity,
    orderValue: order.orderValue,
    notes: row.notes,
    followUpDate: followUp?.due_date ?? null,
    followUpReason: followUp?.description ?? null,
    followUpStatus,
    latitude: row.latitude,
    longitude: row.longitude,
    locationCaptured: row.latitude != null && row.longitude != null,
  };
}

function matchesSearch(item: VisitHistoryItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    item.dealerName,
    item.dealerPhone,
    item.city,
    item.state,
    item.area,
    ...item.items.map((line) => line.productName),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

function applyFilters(items: VisitHistoryItem[], filters: VisitHistoryFilters): VisitHistoryItem[] {
  return items.filter((item) => {
    if (filters.order === "order" && !item.orderPlaced) return false;
    if (filters.order === "no_order" && item.orderPlaced) return false;

    if (filters.followUp === "pending" && item.followUpStatus !== "pending") return false;
    if (filters.followUp === "completed" && item.followUpStatus !== "completed") return false;
    if (filters.followUp === "overdue" && item.followUpStatus !== "overdue") return false;

    if (filters.dealerType === "new" && item.dealerType !== "new") return false;
    if (filters.dealerType === "existing" && item.dealerType !== "existing") return false;

    if (filters.city && filters.city !== "all") {
      if ((item.city ?? "").toLowerCase() !== filters.city.toLowerCase()) return false;
    }

    if (filters.q && !matchesSearch(item, filters.q)) return false;

    return true;
  });
}

const VISIT_SELECT = `
  id,
  visit_number,
  visit_date,
  notes,
  latitude,
  longitude,
  dealer_id,
  salesman_id,
  dealer:dealers (
    id,
    business_name,
    phone_number,
    whatsapp_number,
    address,
    city,
    state
  ),
  visit_order_items (
    product_name,
    product_id,
    quantity,
    unit,
    unit_price,
    line_number
  ),
  followups:followups!followups_created_from_visit_id_fkey (
    id,
    description,
    due_date,
    status
  ),
  salesman:salesmen (
    full_name
  )
`;

async function fetchPriorVisits(supabase: DbClient, salesmanId: string): Promise<PriorVisitRef[]> {
  const { data, error } = await supabase
    .from("visits")
    .select("dealer_id, visit_date")
    .eq("salesman_id", salesmanId)
    .order("visit_date", { ascending: true });

  if (error) {
    console.error("[visit-history] prior visits lookup failed", error);
    return [];
  }

  return data ?? [];
}

export async function listVisitsForSalesman(
  supabase: DbClient,
  salesmanId: string,
  filters: VisitHistoryFilters,
): Promise<{ items: VisitHistoryItem[]; summary: VisitHistorySummary; cities: string[] }> {
  const { from, to } = getDateRangeBounds(filters.range, filters.from, filters.to);

  const [priorVisits, visitsResult] = await Promise.all([
    fetchPriorVisits(supabase, salesmanId),
    supabase
      .from("visits")
      .select(VISIT_SELECT)
      .eq("salesman_id", salesmanId)
      .gte("visit_date", from.toISOString())
      .lte("visit_date", to.toISOString())
      .order("visit_date", { ascending: false }),
  ]);

  if (visitsResult.error) {
    console.error("[visit-history] list visits failed", visitsResult.error);
    throw new Error("Could not load visit history.");
  }

  const mapped = (visitsResult.data as RawVisitRow[]).map((row) => mapVisitRow(row, priorVisits));
  const filtered = applyFilters(mapped, filters);
  const cities = [...new Set(mapped.map((item) => item.city).filter(Boolean) as string[])].sort();

  return {
    items: filtered,
    summary: computeSummary(filtered),
    cities,
  };
}

export async function getVisitDetail(
  supabase: DbClient,
  visitId: string,
): Promise<VisitHistoryDetailCore | null> {
  const { data, error } = await supabase
    .from("visits")
    .select(VISIT_SELECT)
    .eq("id", visitId)
    .maybeSingle();

  if (error) {
    console.error("[visit-history] get visit detail failed", error);
    throw new Error("Could not load visit details.");
  }

  if (!data) return null;

  const row = data as RawVisitRow;
  const priorVisits = await fetchPriorVisits(supabase, row.salesman_id);
  const base = mapVisitRow(row, priorVisits);
  const dealer = unwrapOne(row.dealer);

  const { data: previousRows, error: previousError } = await supabase
    .from("visits")
    .select("id, visit_number, visit_date")
    .eq("dealer_id", row.dealer_id)
    .eq("salesman_id", row.salesman_id)
    .neq("id", visitId)
    .order("visit_date", { ascending: false })
    .limit(5);

  if (previousError) {
    console.error("[visit-history] previous visits lookup failed", previousError);
  }

  const previousVisits: PreviousVisitSummary[] = (previousRows ?? []).map((visit) => ({
    id: visit.id,
    visitNumber: visit.visit_number ? `V-${visit.visit_number}` : null,
    visitedAt: visit.visit_date,
  }));

  return {
    ...base,
    dealerAddress: dealer?.address ?? null,
    previousVisits,
  };
}

export function hasActiveFilters(filters: VisitHistoryFilters): boolean {
  return (
    filters.order !== "all" ||
    filters.followUp !== "all" ||
    filters.dealerType !== "all" ||
    Boolean(filters.city && filters.city !== "all") ||
    Boolean(filters.q?.trim())
  );
}

export type { OrderFilter, FollowUpFilter, DealerTypeFilter };
