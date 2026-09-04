export type VisitDealerType = "new" | "existing";

export type VisitFollowUpStatus = "none" | "pending" | "completed" | "overdue";

export interface VisitHistoryOrderItem {
  productId?: string | null;
  productName: string;
  quantity: number;
  unit?: string;
  price?: number;
  lineTotal?: number;
}

export interface VisitHistoryItem {
  id: string;
  visitNumber: string | null;
  dealerId: string;
  dealerName: string;
  dealerPhone?: string | null;
  dealerWhatsapp?: string | null;
  dealerType: VisitDealerType;
  city?: string | null;
  state?: string | null;
  area?: string | null;
  visitedAt: string;
  salespersonId?: string;
  salespersonName?: string | null;
  orderPlaced: boolean;
  items: VisitHistoryOrderItem[];
  productCount: number;
  totalQuantity: number;
  orderValue?: number;
  notes?: string | null;
  followUpDate?: string | null;
  followUpReason?: string | null;
  followUpStatus: VisitFollowUpStatus;
  latitude?: number | null;
  longitude?: number | null;
  locationCaptured: boolean;
  /** Present when selected; admin Visit Activity always populates this. */
  source?: "web" | "whatsapp";
}

export interface VisitHistorySummary {
  totalVisits: number;
  ordersPlaced: number;
  noOrder: number;
  pendingFollowUps: number;
}

export interface PreviousVisitSummary {
  id: string;
  visitNumber: string | null;
  visitedAt: string;
}

export interface VisitAttachment {
  id: string;
  fileName: string | null;
  mimeType: string | null;
  url: string;
}

export interface VisitHistoryDetail extends VisitHistoryItem {
  dealerAddress?: string | null;
  attachments: VisitAttachment[];
  previousVisits: PreviousVisitSummary[];
}

export type DateRangePreset = "today" | "week" | "month" | "custom";

export type OrderFilter = "all" | "order" | "no_order";

export type FollowUpFilter = "all" | "pending" | "completed" | "overdue";

export type DealerTypeFilter = "all" | "new" | "existing";

export type VisitSortOption = "newest" | "oldest" | "order_value" | "follow_up_due";

export interface VisitHistoryFilters {
  range: DateRangePreset;
  from?: string;
  to?: string;
  q?: string;
  order: OrderFilter;
  followUp: FollowUpFilter;
  dealerType: DealerTypeFilter;
  city?: string;
  sort: VisitSortOption;
}

export const DEFAULT_VISIT_HISTORY_FILTERS: VisitHistoryFilters = {
  range: "month",
  order: "all",
  followUp: "all",
  dealerType: "all",
  sort: "newest",
};
