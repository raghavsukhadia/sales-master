import type { VisitActivitySummary } from "@/lib/types/visit-activity";

interface VisitActivitySummaryStripProps {
  summary: VisitActivitySummary;
}

export function VisitActivitySummaryStrip({ summary }: VisitActivitySummaryStripProps) {
  const metrics = [
    { label: "Visits", value: summary.totalVisits },
    { label: "Active Salesmen", value: summary.activeSalesmen },
    { label: "New Dealers", value: summary.newDealers },
    { label: "Orders", value: summary.orders },
    { label: "Follow-ups Due", value: summary.followUpsDue },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-white px-2 py-2 shadow-sm sm:grid-cols-3 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-border/60">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col items-center justify-center px-2 py-1 lg:py-0.5"
        >
          <p className="text-base font-semibold tabular-nums leading-none">{metric.value}</p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}
