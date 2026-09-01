import { Button } from "@/components/ui/button";
import type { VisitFollowUpStatus } from "@/lib/types/visit-history";
import { VisitStatusChip } from "./visit-status-chip";

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
    return <p className="text-sm text-muted-foreground">No follow-up scheduled.</p>;
  }

  const chipVariant =
    followUpStatus === "overdue"
      ? "follow-up-overdue"
      : followUpStatus === "completed"
        ? "follow-up-completed"
        : "follow-up-pending";

  return (
    <div className="flex flex-col gap-2">
      {followUpLabel ? (
        <p
          className={
            followUpStatus === "overdue"
              ? "text-sm font-medium text-red-700"
              : followUpStatus === "pending"
                ? "text-sm font-medium text-amber-800"
                : "text-sm font-medium"
          }
        >
          {followUpLabel}
        </p>
      ) : null}
      {followUpDate ? (
        <p className="text-sm text-muted-foreground">
          Due{" "}
          {new Date(followUpDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      ) : null}
      {followUpReason ? <p className="text-sm text-muted-foreground">{followUpReason}</p> : null}
      {followUpStatus !== "none" ? (
        <VisitStatusChip
          label={
            followUpStatus === "overdue"
              ? "Overdue"
              : followUpStatus === "completed"
                ? "Completed"
                : "Follow-up due"
          }
          variant={chipVariant}
        />
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" disabled title="Coming soon">
          Mark complete
        </Button>
        <Button type="button" variant="outline" size="sm" disabled title="Coming soon">
          Reschedule
        </Button>
      </div>
    </div>
  );
}
