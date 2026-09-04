"use client";

import { X } from "lucide-react";
import type {
  VisitActivityFilters,
  VisitActivityFilterOptions,
  VisitActivityFollowUpFilter,
  VisitActivityResultFilter,
} from "@/lib/types/visit-activity";
import type { DealerTypeFilter } from "@/lib/types/visit-history";
import { countAdvancedVisitActivityFilters } from "@/lib/validations/visit-activity";

const RESULT_LABELS: Record<VisitActivityResultFilter, string> = {
  all: "All results",
  order: "Order placed",
  no_order: "No order",
};

const DEALER_TYPE_LABELS: Record<DealerTypeFilter, string> = {
  all: "All dealers",
  new: "New dealer",
  existing: "Existing dealer",
};

const FOLLOWUP_LABELS: Record<VisitActivityFollowUpFilter, string> = {
  all: "All follow-ups",
  scheduled: "Follow-up scheduled",
  none: "No follow-up",
  due_today: "Due today",
  overdue: "Overdue",
  completed: "Completed",
};

interface VisitActivityFilterChipsProps {
  filters: VisitActivityFilters;
  filterOptions: VisitActivityFilterOptions;
  onRemove: (patch: Partial<VisitActivityFilters>) => void;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
    >
      {label}
      <X className="h-3 w-3 text-muted-foreground" aria-hidden />
      <span className="sr-only">Remove {label}</span>
    </button>
  );
}

export function VisitActivityFilterChips({
  filters,
  filterOptions,
  onRemove,
}: VisitActivityFilterChipsProps) {
  if (countAdvancedVisitActivityFilters(filters) === 0) return null;

  const chips: { key: string; label: string; patch: Partial<VisitActivityFilters> }[] = [];

  if (filters.salesman) {
    const name =
      filterOptions.salesmen.find((s) => s.id === filters.salesman)?.fullName ?? "Salesman";
    chips.push({
      key: "salesman",
      label: name,
      patch: { salesman: undefined },
    });
  }

  if (filters.state) {
    chips.push({
      key: "state",
      label: filters.state,
      patch: { state: undefined, city: undefined },
    });
  }

  if (filters.city) {
    chips.push({
      key: "city",
      label: filters.city,
      patch: { city: undefined },
    });
  }

  if (filters.result !== "all") {
    chips.push({
      key: "result",
      label: RESULT_LABELS[filters.result],
      patch: { result: "all" },
    });
  }

  if (filters.dealerType !== "all") {
    chips.push({
      key: "dealerType",
      label: DEALER_TYPE_LABELS[filters.dealerType],
      patch: { dealerType: "all" },
    });
  }

  if (filters.followup !== "all") {
    chips.push({
      key: "followup",
      label: FOLLOWUP_LABELS[filters.followup],
      patch: { followup: "all" },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          onRemove={() => onRemove({ ...chip.patch, page: 1 })}
        />
      ))}
    </div>
  );
}
