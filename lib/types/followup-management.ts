import type { CallOutcome, FollowupDueBucket } from "@/lib/types/followups";

export type FollowupManagementStatusTab =
  | "all"
  | "overdue"
  | "due_today"
  | "upcoming"
  | "completed";

export type FollowupManagementPriorityFilter = "all" | "low" | "medium" | "high";

export type FollowupManagementOutcomeFilter = "all" | CallOutcome;

export type FollowupManagementSortOption =
  | "due"
  | "newest"
  | "oldest"
  | "priority"
  | "salesman";

export interface FollowupManagementFilters {
  status: FollowupManagementStatusTab;
  q?: string;
  salesman?: string;
  state?: string;
  city?: string;
  priority: FollowupManagementPriorityFilter;
  outcome: FollowupManagementOutcomeFilter;
  dueFrom?: string;
  dueTo?: string;
  sort: FollowupManagementSortOption;
  page: number;
}

export const DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS: FollowupManagementFilters = {
  status: "all",
  priority: "all",
  outcome: "all",
  sort: "due",
  page: 1,
};

export const FOLLOWUP_MANAGEMENT_PAGE_SIZE = 25;

export interface FollowupManagementSummary {
  overdue: number;
  dueToday: number;
  upcoming: number;
  completed: number;
  noResponse: number;
}

export interface FollowupLastAction {
  label: string;
  outcome: CallOutcome | null;
  at: string | null;
  notes: string | null;
}

export type FollowupDisplayStatus = FollowupDueBucket | "completed";

export interface FollowupManagementItem {
  id: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  displayStatus: FollowupDisplayStatus;
  dealerId: string;
  dealerName: string;
  dealerPhone: string | null;
  city: string | null;
  state: string | null;
  salesmanId: string;
  salesmanName: string;
  productContext: string | null;
  createdFromVisitId: string | null;
  parentFollowupId: string | null;
  outcome: CallOutcome | null;
  completedAt: string | null;
  completionNotes: string | null;
  createdAt: string;
  lastAction: FollowupLastAction;
  needsAttention: boolean;
  attentionReasons: string[];
  nextDescription: string | null;
  nextDueDate: string | null;
}

export interface FollowupTimelineEvent {
  id: string;
  at: string;
  title: string;
  detail?: string | null;
}

export interface FollowupManagementDetail extends FollowupManagementItem {
  timeline: FollowupTimelineEvent[];
  visitDate: string | null;
}

export interface FollowupManagementSalesmanOption {
  id: string;
  fullName: string;
}

export interface FollowupManagementLocationOption {
  state: string;
  cities: string[];
}

export interface FollowupManagementFilterOptions {
  salesmen: FollowupManagementSalesmanOption[];
  locations: FollowupManagementLocationOption[];
}

export interface FollowupManagementListResult {
  items: FollowupManagementItem[];
  summary: FollowupManagementSummary;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filterOptions: FollowupManagementFilterOptions;
}
