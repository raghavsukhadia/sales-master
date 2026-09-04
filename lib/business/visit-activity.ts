import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  deriveDealerType,
  deriveFollowUpStatus,
  getDateRangeBounds,
  getVisitDetail,
} from "@/lib/business/visit-history";
import type { VisitHistoryDetailCore } from "@/lib/business/visit-history";
import type {
  VisitActivityFilters,
  VisitActivityFilterOptions,
  VisitActivityFollowUpFilter,
  VisitActivityItem,
  VisitActivityListResult,
  VisitActivitySortOption,
  VisitActivitySummary,
  VisitSource,
} from "@/lib/types/visit-activity";
import { VISIT_ACTIVITY_PAGE_SIZE } from "@/lib/types/visit-activity";
import type { VisitHistoryOrderItem } from "@/lib/types/visit-history";

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
  source: VisitSource;
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
  salesman_id: string;
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

function isDueToday(dueDate: string, now: Date = new Date()): boolean {
  const due = startOfDay(new Date(dueDate));
  const today = startOfDay(now);
  return due.getTime() === today.getTime();
}

const VISIT_ACTIVITY_SELECT = `
  id,
  visit_number,
  visit_date,
  notes,
  latitude,
  longitude,
  source,
  dealer_id,
  salesman_id,
  dealer:dealers!inner (
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

function mapVisitActivityRow(
  row: RawVisitRow,
  priorVisits: PriorVisitRef[],
): VisitActivityItem {
  const dealer = unwrapOne(row.dealer);
  const followUp = unwrapOne(row.followups);
  const salesman = unwrapOne(row.salesman);
  const order = mapOrderItems(row.visit_order_items);
  const followUpStatus = deriveFollowUpStatus(followUp);

  const salesmanPriors = priorVisits.filter((p) => p.salesman_id === row.salesman_id);

  return {
    id: row.id,
    visitNumber: row.visit_number ? `V-${row.visit_number}` : null,
    dealerId: row.dealer_id,
    dealerName: dealer?.business_name ?? "Unknown dealer",
    dealerPhone: dealer?.phone_number,
    dealerWhatsapp: dealer?.whatsapp_number,
    dealerType: deriveDealerType(row, salesmanPriors),
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
    source: row.source === "web" ? "web" : "whatsapp",
  };
}

export function matchesVisitActivitySearch(item: VisitActivityItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    item.dealerName,
    item.dealerPhone,
    item.salespersonName,
    item.city,
    item.state,
    ...item.items.map((line) => line.productName),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function matchesVisitActivityFollowUp(
  item: VisitActivityItem,
  filter: VisitActivityFollowUpFilter,
  now: Date = new Date(),
): boolean {
  if (filter === "all") return true;
  if (filter === "none") return item.followUpStatus === "none";
  if (filter === "completed") return item.followUpStatus === "completed";
  if (filter === "overdue") return item.followUpStatus === "overdue";
  if (filter === "scheduled") return item.followUpStatus === "pending";
  if (filter === "due_today") {
    return (
      item.followUpStatus === "pending" &&
      Boolean(item.followUpDate) &&
      isDueToday(item.followUpDate!, now)
    );
  }
  return true;
}

function applyVisitActivityFilters(
  items: VisitActivityItem[],
  filters: VisitActivityFilters,
  now: Date = new Date(),
): VisitActivityItem[] {
  return items.filter((item) => {
    if (filters.result === "order" && !item.orderPlaced) return false;
    if (filters.result === "no_order" && item.orderPlaced) return false;

    if (filters.dealerType === "new" && item.dealerType !== "new") return false;
    if (filters.dealerType === "existing" && item.dealerType !== "existing") return false;

    if (!matchesVisitActivityFollowUp(item, filters.followup, now)) return false;

    if (filters.q && !matchesVisitActivitySearch(item, filters.q)) return false;

    return true;
  });
}

export function computeVisitActivitySummary(items: VisitActivityItem[]): VisitActivitySummary {
  const salesmanIds = new Set(
    items.map((item) => item.salespersonId).filter((id): id is string => Boolean(id)),
  );

  return {
    totalVisits: items.length,
    activeSalesmen: salesmanIds.size,
    newDealers: items.filter((item) => item.dealerType === "new").length,
    orders: items.filter((item) => item.orderPlaced).length,
    followUpsDue: items.filter(
      (item) => item.followUpStatus === "pending" || item.followUpStatus === "overdue",
    ).length,
  };
}

export function sortVisitActivityItems(
  items: VisitActivityItem[],
  sort: VisitActivitySortOption,
): VisitActivityItem[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
      case "salesman": {
        const nameCmp = (a.salespersonName ?? "").localeCompare(b.salespersonName ?? "", undefined, {
          sensitivity: "base",
        });
        if (nameCmp !== 0) return nameCmp;
        return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
      }
      case "dealer": {
        const nameCmp = a.dealerName.localeCompare(b.dealerName, undefined, { sensitivity: "base" });
        if (nameCmp !== 0) return nameCmp;
        return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
      }
      case "result": {
        if (a.orderPlaced !== b.orderPlaced) return a.orderPlaced ? -1 : 1;
        return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
      }
      case "newest":
      default:
        return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
    }
  });

  return sorted;
}

export function paginateVisitActivityItems<T>(
  items: T[],
  page: number,
  pageSize: number = VISIT_ACTIVITY_PAGE_SIZE,
): { pageItems: T[]; page: number; totalPages: number; totalCount: number } {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalCount,
  };
}

async function fetchPriorVisitsForSalesmen(
  supabase: DbClient,
  salesmanIds: string[],
): Promise<PriorVisitRef[]> {
  if (salesmanIds.length === 0) return [];

  const { data, error } = await supabase
    .from("visits")
    .select("dealer_id, visit_date, salesman_id")
    .in("salesman_id", salesmanIds)
    .order("visit_date", { ascending: true });

  if (error) {
    console.error("[visit-activity] prior visits lookup failed", error);
    return [];
  }

  return data ?? [];
}

async function loadFilterOptions(supabase: DbClient): Promise<VisitActivityFilterOptions> {
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
    console.error("[visit-activity] salesmen options failed", salesmenResult.error);
  }
  if (dealersResult.error) {
    console.error("[visit-activity] location options failed", dealersResult.error);
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

export async function listVisitsForAdmin(
  supabase: DbClient,
  filters: VisitActivityFilters,
): Promise<VisitActivityListResult> {
  const { from, to } = getDateRangeBounds(filters.period, filters.from, filters.to);
  const filterOptions = await loadFilterOptions(supabase);

  let query = supabase
    .from("visits")
    .select(VISIT_ACTIVITY_SELECT)
    .gte("visit_date", from.toISOString())
    .lte("visit_date", to.toISOString())
    .order("visit_date", { ascending: false });

  if (filters.salesman) {
    query = query.eq("salesman_id", filters.salesman);
  }

  if (filters.state) {
    query = query.eq("dealer.state", filters.state);
  }

  if (filters.city) {
    query = query.eq("dealer.city", filters.city);
  }

  const visitsResult = await query;

  if (visitsResult.error) {
    console.error("[visit-activity] list visits failed", visitsResult.error);
    throw new Error("Could not load visit activity.");
  }

  const rows = (visitsResult.data ?? []) as unknown as RawVisitRow[];
  const salesmanIds = [...new Set(rows.map((row) => row.salesman_id))];
  const priorVisits = await fetchPriorVisitsForSalesmen(supabase, salesmanIds);

  const mapped = rows.map((row) => mapVisitActivityRow(row, priorVisits));
  const filtered = applyVisitActivityFilters(mapped, filters);
  const sorted = sortVisitActivityItems(filtered, filters.sort);
  const summary = computeVisitActivitySummary(filtered);
  const { pageItems, page, totalPages, totalCount } = paginateVisitActivityItems(
    sorted,
    filters.page,
  );

  return {
    items: pageItems,
    summary,
    totalCount,
    page,
    pageSize: VISIT_ACTIVITY_PAGE_SIZE,
    totalPages,
    filterOptions,
  };
}

export async function getVisitDetailForAdmin(
  supabase: DbClient,
  visitId: string,
): Promise<(VisitHistoryDetailCore & { source: VisitSource }) | null> {
  const detail = await getVisitDetail(supabase, visitId);
  if (!detail) return null;

  const { data, error } = await supabase
    .from("visits")
    .select("source")
    .eq("id", visitId)
    .maybeSingle();

  if (error) {
    console.error("[visit-activity] source lookup failed", error);
  }

  const source: VisitSource = data?.source === "web" ? "web" : "whatsapp";

  return {
    ...detail,
    source,
  };
}
