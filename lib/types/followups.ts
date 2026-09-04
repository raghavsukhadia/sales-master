export type FollowupDueBucket = "overdue" | "due_today" | "upcoming";

export type CallOutcome =
  | "interested"
  | "call_again"
  | "send_quotation"
  | "no_answer"
  | "not_interested";

export interface SalesmanFollowupItem {
  id: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed" | "cancelled";
  dealerId: string;
  dealerName: string;
  city: string | null;
  dealerPhone: string | null;
  telLink: string | null;
  productContext: string | null;
  createdFromVisitId: string | null;
  dueBucket: FollowupDueBucket;
}

export interface FollowupsSummary {
  overdue: number;
  dueToday: number;
  upcoming: number;
  total: number;
}

export interface GroupedFollowups {
  overdue: SalesmanFollowupItem[];
  dueToday: SalesmanFollowupItem[];
  upcoming: SalesmanFollowupItem[];
}

export interface RecordFollowupOutcomeParams {
  followupId: string;
  salesmanId: string;
  userId: string;
  outcome: CallOutcome;
  note?: string;
  nextDueDate?: string;
}

export interface RecordFollowupOutcomeResult {
  success: boolean;
  error?: string;
  followupId: string;
  nextFollowupId?: string;
  alreadyCompleted?: boolean;
}

export interface CreateFollowupFromVisitParams {
  userId: string;
  salesmanId: string;
  dealerId: string;
  visitId: string;
  description: string;
  dueDate: string;
}

export interface CreateFollowupFromVisitResult {
  success: boolean;
  error?: string;
  followupId?: string;
  alreadyExisted?: boolean;
}
