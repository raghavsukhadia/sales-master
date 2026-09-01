import type { VisitHistoryItem } from "@/lib/types/visit-history";
import { groupVisitsByDateLabel } from "@/lib/utils/visit-history-format";
import { VisitCard } from "./visit-card";

interface VisitHistoryGroupedListProps {
  visits: VisitHistoryItem[];
}

export function VisitHistoryGroupedList({ visits }: VisitHistoryGroupedListProps) {
  const groups = groupVisitsByDateLabel(visits);

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h2>
          <div className="flex flex-col gap-2.5">
            {group.items.map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
