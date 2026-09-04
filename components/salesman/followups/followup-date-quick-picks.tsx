"use client";

import { cn } from "@/lib/utils";
import type { QuickDateOption } from "@/lib/validations/followup-outcome";

const OPTIONS: { id: QuickDateOption | "custom"; label: string }[] = [
  { id: "tomorrow", label: "Tomorrow" },
  { id: "inTwoDays", label: "In 2 Days" },
  { id: "nextWeek", label: "Next Week" },
  { id: "custom", label: "Custom" },
];

interface FollowupDateQuickPicksProps {
  selected: QuickDateOption | "custom" | null;
  customDate: string;
  onSelectQuick: (option: QuickDateOption) => void;
  onSelectCustom: () => void;
  onCustomDateChange: (value: string) => void;
  /** Section heading. Defaults to "Next follow-up". */
  title?: string;
}

export function FollowupDateQuickPicks({
  selected,
  customDate,
  onSelectQuick,
  onSelectCustom,
  onCustomDateChange,
  title = "Next follow-up",
}: FollowupDateQuickPicksProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => {
          const isCustom = option.id === "custom";
          const isActive = selected === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => (isCustom ? onSelectCustom() : onSelectQuick(option.id as QuickDateOption))}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-white text-foreground hover:bg-muted/50",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected === "custom" ? (
        <input
          type="date"
          value={customDate}
          onChange={(event) => onCustomDateChange(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
        />
      ) : null}
    </div>
  );
}
