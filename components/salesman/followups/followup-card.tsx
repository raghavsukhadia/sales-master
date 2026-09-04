import type { SalesmanFollowupItem } from "@/lib/types/followups";
import { formatListLocation, formatVisitDateShort } from "@/lib/utils/visit-history-format";
import { cn } from "@/lib/utils";
import { VisitStatusChip } from "@/components/salesman/visit-history/visit-status-chip";
import { FollowupCallButton, FollowupRecordOutcomeButton } from "./followup-call-button";

interface FollowupCardProps {
  followup: SalesmanFollowupItem;
  onRecordOutcome: (followup: SalesmanFollowupItem) => void;
}

function priorityLabel(priority: SalesmanFollowupItem["priority"]): string {
  if (priority === "high") return "High priority";
  if (priority === "low") return "Low priority";
  return "Medium priority";
}

function dueLabel(followup: SalesmanFollowupItem): string {
  if (followup.dueBucket === "overdue") {
    return `Overdue · ${formatVisitDateShort(followup.dueDate)}`;
  }
  if (followup.dueBucket === "due_today") {
    return "Due today";
  }
  return `Due ${formatVisitDateShort(followup.dueDate)}`;
}

export function FollowupCard({ followup, onRecordOutcome }: FollowupCardProps) {
  const location = formatListLocation(followup.city, null);
  const isOverdue = followup.dueBucket === "overdue";

  return (
    <article className="rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{followup.dealerName}</p>
            {location !== "—" ? (
              <p className="truncate text-sm text-muted-foreground">{location}</p>
            ) : null}
          </div>
          <VisitStatusChip
            label={priorityLabel(followup.priority)}
            variant={followup.priority === "high" ? "follow-up-overdue" : "follow-up-pending"}
          />
        </div>

        <p className="text-sm text-foreground">{followup.description}</p>
        {followup.productContext ? (
          <p className="text-sm text-muted-foreground">{followup.productContext}</p>
        ) : null}
        <p
          className={cn(
            "text-sm font-medium",
            isOverdue ? "text-red-700" : followup.dueBucket === "due_today" ? "text-amber-800" : "text-muted-foreground",
          )}
        >
          {dueLabel(followup)}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <FollowupCallButton telLink={followup.telLink} dealerPhone={followup.dealerPhone} />
        <FollowupRecordOutcomeButton onClick={() => onRecordOutcome(followup)} />
      </div>
    </article>
  );
}
