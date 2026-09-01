import type { VisitHistoryItem, VisitSortOption } from "@/lib/types/visit-history";

function followUpRank(status: VisitHistoryItem["followUpStatus"]): number {
  if (status === "overdue") return 0;
  if (status === "pending") return 1;
  return 2;
}

function followUpDueTime(item: VisitHistoryItem): number {
  if (!item.followUpDate) return Number.MAX_SAFE_INTEGER;
  return new Date(item.followUpDate).getTime();
}

export function sortVisits(items: VisitHistoryItem[], sort: VisitSortOption): VisitHistoryItem[] {
  const sorted = [...items];

  switch (sort) {
    case "oldest":
      sorted.sort((a, b) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime());
      break;
    case "order_value":
      sorted.sort((a, b) => {
        const valueDiff = (b.orderValue ?? 0) - (a.orderValue ?? 0);
        if (valueDiff !== 0) return valueDiff;
        return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
      });
      break;
    case "follow_up_due":
      sorted.sort((a, b) => {
        const rankDiff = followUpRank(a.followUpStatus) - followUpRank(b.followUpStatus);
        if (rankDiff !== 0) return rankDiff;
        const dueDiff = followUpDueTime(a) - followUpDueTime(b);
        if (dueDiff !== 0) return dueDiff;
        return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
      });
      break;
    case "newest":
    default:
      sorted.sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
      break;
  }

  return sorted;
}
