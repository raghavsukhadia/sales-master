"use client";

import { X } from "lucide-react";
import type {
  FollowupManagementFilters,
  FollowupManagementFilterOptions,
  FollowupManagementPriorityFilter,
} from "@/lib/types/followup-management";
import {
  countAdvancedFollowupManagementFilters,
  OUTCOME_LABELS,
} from "@/lib/validations/followup-management";
import type { CallOutcome } from "@/lib/types/followups";

const PRIORITY_LABELS: Record<Exclude<FollowupManagementPriorityFilter, "all">, string> = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};

interface FollowupManagementFilterChipsProps {
  filters: FollowupManagementFilters;
  filterOptions: FollowupManagementFilterOptions;
  onRemove: (patch: Partial<FollowupManagementFilters>) => void;
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

export function FollowupManagementFilterChips({
  filters,
  filterOptions,
  onRemove,
}: FollowupManagementFilterChipsProps) {
  if (countAdvancedFollowupManagementFilters(filters) === 0) return null;

  const chips: { key: string; label: string; patch: Partial<FollowupManagementFilters> }[] = [];

  if (filters.salesman) {
    const name =
      filterOptions.salesmen.find((s) => s.id === filters.salesman)?.fullName ?? "Salesman";
    chips.push({ key: "salesman", label: name, patch: { salesman: undefined } });
  }
  if (filters.state) {
    chips.push({
      key: "state",
      label: filters.state,
      patch: { state: undefined, city: undefined },
    });
  }
  if (filters.city) {
    chips.push({ key: "city", label: filters.city, patch: { city: undefined } });
  }
  if (filters.priority !== "all") {
    chips.push({
      key: "priority",
      label: PRIORITY_LABELS[filters.priority],
      patch: { priority: "all" },
    });
  }
  if (filters.outcome !== "all") {
    chips.push({
      key: "outcome",
      label: OUTCOME_LABELS[filters.outcome as CallOutcome],
      patch: { outcome: "all" },
    });
  }
  if (filters.dueFrom) {
    chips.push({
      key: "dueFrom",
      label: `From ${filters.dueFrom}`,
      patch: { dueFrom: undefined },
    });
  }
  if (filters.dueTo) {
    chips.push({
      key: "dueTo",
      label: `To ${filters.dueTo}`,
      patch: { dueTo: undefined },
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
