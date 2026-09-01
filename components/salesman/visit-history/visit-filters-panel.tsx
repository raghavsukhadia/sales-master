"use client";

import type { DealerTypeFilter, FollowUpFilter, OrderFilter } from "@/lib/types/visit-history";
import { cn } from "@/lib/utils";

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-white text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface VisitFiltersPanelProps {
  order: OrderFilter;
  followUp: FollowUpFilter;
  dealerType: DealerTypeFilter;
  city: string;
  cities: string[];
  onOrderChange: (value: OrderFilter) => void;
  onFollowUpChange: (value: FollowUpFilter) => void;
  onDealerTypeChange: (value: DealerTypeFilter) => void;
  onCityChange: (value: string) => void;
  onClear: () => void;
}

export function VisitFiltersPanel({
  order,
  followUp,
  dealerType,
  city,
  cities,
  onOrderChange,
  onFollowUpChange,
  onDealerTypeChange,
  onCityChange,
  onClear,
}: VisitFiltersPanelProps) {
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Clear all
        </button>
      </div>

      <FilterGroup
        label="Order status"
        value={order}
        onChange={onOrderChange}
        options={[
          { value: "all", label: "All" },
          { value: "order", label: "Order placed" },
          { value: "no_order", label: "No order" },
        ]}
      />

      <FilterGroup
        label="Follow-up"
        value={followUp}
        onChange={onFollowUpChange}
        options={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "completed", label: "Completed" },
          { value: "overdue", label: "Overdue" },
        ]}
      />

      <FilterGroup
        label="Dealer type"
        value={dealerType}
        onChange={onDealerTypeChange}
        options={[
          { value: "all", label: "All" },
          { value: "new", label: "New dealer" },
          { value: "existing", label: "Existing dealer" },
        ]}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">City</p>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          className="h-11 rounded-lg border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All cities</option>
          {cities.map((cityName) => (
            <option key={cityName} value={cityName}>
              {cityName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
