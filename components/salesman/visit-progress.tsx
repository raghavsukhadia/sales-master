"use client";

import { cn } from "@/lib/utils";
import type { VisitStep } from "@/lib/types/salesman-visit";

const STEPS = [
  { id: 1 as const, label: "Dealer" },
  { id: 2 as const, label: "Order details" },
  { id: "success" as const, label: "Done" },
];

export function VisitProgress({ step }: { step: VisitStep }) {
  const currentIndex = step === "success" ? 2 : step - 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {STEPS.map((s, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={s.label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    isComplete && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isComplete && !isCurrent && "bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? "✓" : index + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mb-5 h-0.5 flex-1 rounded-full",
                    index < currentIndex ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
