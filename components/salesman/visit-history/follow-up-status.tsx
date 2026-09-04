import { Button } from "@/components/ui/button";
import type { VisitFollowUpStatus } from "@/lib/types/visit-history";
import { cn } from "@/lib/utils";

interface FollowUpStatusPanelProps {
  followUpDate?: string | null;
  followUpReason?: string | null;
  followUpStatus: VisitFollowUpStatus;
  followUpLabel?: string;
}

export function FollowUpStatusPanel({
  followUpDate,
  followUpReason,
  followUpStatus,
  followUpLabel,
}: FollowUpStatusPanelProps) {
  if (followUpStatus === "none" && !followUpDate) {
    return <p className="text-sm text-muted-foreground">No follow-up scheduled</p>;
  }

  const isActionable =
    followUpStatus === "pending" || followUpStatus === "overdue";
  const actionTitle = followUpReason?.trim() || "Follow-up";

  const dueAbsolute = followUpDate
    ? new Date(followUpDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const dueRelative =
    followUpLabel && followUpLabel !== "No follow-up"
      ? followUpLabel.replace(/^Follow-up /, "Due ")
      : null;

  const dueLineParts = [dueRelative, dueAbsolute].filter(Boolean);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg",
        isActionable ? "border border-border/60 bg-amber-50/40 px-4 py-4" : "gap-2",
        followUpStatus === "overdue" && isActionable ? "bg-red-50/40" : null,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold tracking-tight text-foreground">{actionTitle}</p>
        {dueLineParts.length > 0 ? (
          <p
            className={cn(
              "text-sm",
              followUpStatus === "overdue"
                ? "font-medium text-red-700"
                : "text-muted-foreground",
            )}
          >
            {dueLineParts.join(" • ")}
          </p>
        ) : null}
        {followUpStatus === "completed" ? (
          <p className="text-sm text-muted-foreground">Completed</p>
        ) : null}
      </div>

      {isActionable ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" disabled title="Coming soon">
            Mark complete
          </Button>
          <Button type="button" variant="outline" size="sm" disabled title="Coming soon">
            Reschedule
          </Button>
        </div>
      ) : null}
    </div>
  );
}
