import type { GroupedFollowups } from "@/lib/types/followups";
import { FollowupCard } from "./followup-card";
import type { SalesmanFollowupItem } from "@/lib/types/followups";

interface FollowupsGroupedListProps {
  grouped: GroupedFollowups;
  onRecordOutcome: (followup: SalesmanFollowupItem) => void;
}

function FollowupSection({
  title,
  items,
  onRecordOutcome,
}: {
  title: string;
  items: SalesmanFollowupItem[];
  onRecordOutcome: (followup: SalesmanFollowupItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="flex flex-col gap-2.5">
        {items.map((followup) => (
          <FollowupCard key={followup.id} followup={followup} onRecordOutcome={onRecordOutcome} />
        ))}
      </div>
    </section>
  );
}

export function FollowupsGroupedList({ grouped, onRecordOutcome }: FollowupsGroupedListProps) {
  return (
    <div className="flex flex-col gap-5">
      <FollowupSection title="Overdue" items={grouped.overdue} onRecordOutcome={onRecordOutcome} />
      <FollowupSection title="Due Today" items={grouped.dueToday} onRecordOutcome={onRecordOutcome} />
      <FollowupSection title="Upcoming" items={grouped.upcoming} onRecordOutcome={onRecordOutcome} />
    </div>
  );
}
