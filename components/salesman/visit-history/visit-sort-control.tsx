"use client";

import type { VisitSortOption } from "@/lib/types/visit-history";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_OPTIONS: { value: VisitSortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest" },
  { value: "order_value", label: "Highest order value" },
  { value: "follow_up_due", label: "Follow-up due" },
];

interface VisitSortControlProps {
  value: VisitSortOption;
  onChange: (value: VisitSortOption) => void;
}

export function VisitSortControl({ value, onChange }: VisitSortControlProps) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as VisitSortOption)}>
      <SelectTrigger className="h-10 w-full min-w-[160px] bg-white md:w-auto" aria-label="Sort visits">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent align="start">
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
