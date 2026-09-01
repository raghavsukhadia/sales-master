import type { VisitHistorySummary } from "@/lib/types/visit-history";

interface VisitSummaryProps {
  summary: VisitHistorySummary;
}

export function VisitSummary({ summary }: VisitSummaryProps) {
  const metrics = [
    { label: "Visits", value: summary.totalVisits },
    { label: "Orders", value: summary.ordersPlaced },
    { label: "No Order", value: summary.noOrder },
    { label: "Follow-ups", value: summary.pendingFollowUps },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-white px-2 py-2 shadow-sm md:grid-cols-4 md:gap-0 md:divide-x md:divide-border/60">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex flex-col items-center justify-center px-2 py-1 md:py-0.5">
          <p className="text-base font-semibold tabular-nums leading-none">{metric.value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}
