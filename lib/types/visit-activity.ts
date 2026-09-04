import type {
  DateRangePreset,
  DealerTypeFilter,
  OrderFilter,
  VisitHistoryDetail,
  VisitHistoryItem,
} from "@/lib/types/visit-history";

export type VisitActivityPeriod = DateRangePreset;

export type VisitActivityResultFilter = OrderFilter;

export type VisitActivityFollowUpFilter =
  | "all"
  | "scheduled"
  | "none"
  | "due_today"
  | "overdue"
  | "completed";

export type VisitActivitySortOption =
  | "newest"
  | "oldest"
  | "salesman"
  | "dealer"
  | "result";

export type VisitSource = "web" | "whatsapp";

export interface VisitActivityItem extends VisitHistoryItem {
  source: VisitSource;
}

export interface VisitActivityDetail extends VisitHistoryDetail {
  source: VisitSource;
}

export interface VisitActivitySummary {
  totalVisits: number;
  activeSalesmen: number;
  newDealers: number;
  orders: number;
  followUpsDue: number;
}

export interface VisitActivityFilters {
  period: VisitActivityPeriod;
  from?: string;
  to?: string;
  q?: string;
  salesman?: string;
  state?: string;
  city?: string;
  result: VisitActivityResultFilter;
  dealerType: DealerTypeFilter;
  followup: VisitActivityFollowUpFilter;
  sort: VisitActivitySortOption;
  page: number;
}

export const DEFAULT_VISIT_ACTIVITY_FILTERS: VisitActivityFilters = {
  period: "month",
  result: "all",
  dealerType: "all",
  followup: "all",
  sort: "newest",
  page: 1,
};

export const VISIT_ACTIVITY_PAGE_SIZE = 25;

export interface VisitActivitySalesmanOption {
  id: string;
  fullName: string;
}

export interface VisitActivityLocationOption {
  state: string;
  cities: string[];
}

export interface VisitActivityFilterOptions {
  salesmen: VisitActivitySalesmanOption[];
  locations: VisitActivityLocationOption[];
}

export interface VisitActivityListResult {
  items: VisitActivityItem[];
  summary: VisitActivitySummary;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filterOptions: VisitActivityFilterOptions;
}
