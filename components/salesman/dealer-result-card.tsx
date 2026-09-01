"use client";

import { ChevronRight } from "lucide-react";
import type { DealerSearchResult } from "@/lib/business/dealers";
import { cn } from "@/lib/utils";

function formatLastVisit(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Visited today";
  if (diffDays === 1) return "Visited yesterday";
  if (diffDays < 30) return `Visited ${diffDays} days ago`;
  return `Last visit ${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

interface DealerResultCardProps {
  dealer: DealerSearchResult;
  selected: boolean;
  onSelect: () => void;
}

export function DealerResultCard({ dealer, selected, onSelect }: DealerResultCardProps) {
  const location = [dealer.city, dealer.state].filter(Boolean).join(", ");
  const lastVisit = formatLastVisit(dealer.last_visit_at);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-white hover:border-primary/30 hover:bg-muted/30",
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary bg-primary" : "border-muted-foreground/40",
        )}
      >
        {selected ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{dealer.business_name}</p>
        <p className="text-sm text-muted-foreground">
          {[dealer.phone_number, location].filter(Boolean).join(" · ") || "—"}
        </p>
        {lastVisit ? <p className="mt-0.5 text-xs text-muted-foreground">{lastVisit}</p> : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
