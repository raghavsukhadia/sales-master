"use client";

import { X } from "lucide-react";
import type {
  DealerTypeFilter,
  FollowUpFilter,
  OrderFilter,
  VisitHistoryFilters,
} from "@/lib/types/visit-history";

interface ActiveFilterChipsProps {
  filters: VisitHistoryFilters;
  onRemove: (patch: Partial<VisitHistoryFilters>) => void;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15"
    >
      {label}
      <X className="h-3 w-3" aria-hidden />
    </button>
  );
}

export function ActiveFilterChips({ filters, onRemove }: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; patch: Partial<VisitHistoryFilters> }[] = [];

  if (filters.city && filters.city !== "all") {
    chips.push({ key: "city", label: filters.city, patch: { city: "all" } });
  }

  if (filters.order !== "all") {
    const labels: Record<OrderFilter, string> = {
      all: "All orders",
      order: "Order placed",
      no_order: "No order",
    };
    chips.push({ key: "order", label: labels[filters.order], patch: { order: "all" } });
  }

  if (filters.followUp !== "all") {
    const labels: Record<FollowUpFilter, string> = {
      all: "All follow-ups",
      pending: "Follow-up due",
      completed: "Completed",
      overdue: "Overdue",
    };
    chips.push({ key: "followUp", label: labels[filters.followUp], patch: { followUp: "all" } });
  }

  if (filters.dealerType !== "all") {
    const labels: Record<DealerTypeFilter, string> = {
      all: "All dealers",
      new: "New dealer",
      existing: "Existing dealer",
    };
    chips.push({
      key: "dealerType",
      label: labels[filters.dealerType],
      patch: { dealerType: "all" },
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Active:</span>
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onRemove={() => onRemove(chip.patch)} />
      ))}
    </div>
  );
}
