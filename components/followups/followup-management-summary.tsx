import type { FollowupManagementSummary } from "@/lib/types/followup-management";

interface FollowupManagementSummaryStripProps {
  summary: FollowupManagementSummary;
}

export function FollowupManagementSummaryStrip({ summary }: FollowupManagementSummaryStripProps) {
  const metrics = [
    { label: "Overdue", value: summary.overdue, emphasize: "danger" as const },
    { label: "Due Today", value: summary.dueToday, emphasize: "warn" as const },
    { label: "Upcoming", value: summary.upcoming, emphasize: "none" as const },
    { label: "Completed", value: summary.completed, emphasize: "none" as const },
    { label: "No Response", value: summary.noResponse, emphasize: "none" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-white px-2 py-2 shadow-sm sm:grid-cols-3 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-border/60">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col items-center justify-center px-2 py-1 lg:py-0.5"
        >
          <p
            className={
              metric.emphasize === "danger"
                ? "text-base font-semibold tabular-nums leading-none text-red-700"
                : metric.emphasize === "warn"
                  ? "text-base font-semibold tabular-nums leading-none text-amber-900"
                  : "text-base font-semibold tabular-nums leading-none"
            }
          >
            {metric.value}
          </p>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}
