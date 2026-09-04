"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VisitDateFilters } from "@/components/salesman/visit-history/visit-date-filters";
import { VisitFiltersSheet } from "@/components/salesman/visit-history/visit-filters-sheet";
import type {
  VisitActivityFilters,
  VisitActivityFilterOptions,
  VisitActivityFollowUpFilter,
  VisitActivityResultFilter,
  VisitActivitySortOption,
} from "@/lib/types/visit-activity";
import type { DateRangePreset, DealerTypeFilter } from "@/lib/types/visit-history";
import {
  clearAdvancedVisitActivityFilters,
  countAdvancedVisitActivityFilters,
} from "@/lib/validations/visit-activity";
import { cn } from "@/lib/utils";
import { VisitActivityFilterChips } from "./visit-activity-filter-chips";

const RESULT_OPTIONS: { value: VisitActivityResultFilter; label: string }[] = [
  { value: "all", label: "All results" },
  { value: "order", label: "Order placed" },
  { value: "no_order", label: "No order" },
];

const DEALER_TYPE_OPTIONS: { value: DealerTypeFilter; label: string }[] = [
  { value: "all", label: "All dealers" },
  { value: "new", label: "New dealer" },
  { value: "existing", label: "Existing dealer" },
];

const FOLLOWUP_OPTIONS: { value: VisitActivityFollowUpFilter; label: string }[] = [
  { value: "all", label: "All follow-ups" },
  { value: "scheduled", label: "Follow-up scheduled" },
  { value: "none", label: "No follow-up" },
  { value: "due_today", label: "Due today" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];

const SORT_OPTIONS: { value: VisitActivitySortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "salesman", label: "Salesman" },
  { value: "dealer", label: "Dealer" },
  { value: "result", label: "Result" },
];

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface AdvancedDraft {
  salesman?: string;
  state?: string;
  city?: string;
  result: VisitActivityResultFilter;
  dealerType: DealerTypeFilter;
  followup: VisitActivityFollowUpFilter;
}

function toAdvancedDraft(filters: VisitActivityFilters): AdvancedDraft {
  return {
    salesman: filters.salesman,
    state: filters.state,
    city: filters.city,
    result: filters.result,
    dealerType: filters.dealerType,
    followup: filters.followup,
  };
}

interface VisitActivityFiltersBarProps {
  filters: VisitActivityFilters;
  filterOptions: VisitActivityFilterOptions;
  onChange: (next: VisitActivityFilters) => void;
  /** Full reset still available from empty state; toolbar no longer shows a global Reset. */
  onReset?: () => void;
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
        aria-label={label}
      >
        {children}
      </select>
    </label>
  );
}

function AdvancedFilterFields({
  draft,
  filterOptions,
  onDraftChange,
}: {
  draft: AdvancedDraft;
  filterOptions: VisitActivityFilterOptions;
  onDraftChange: (next: AdvancedDraft) => void;
}) {
  const citiesForState = useMemo(() => {
    if (!draft.state) {
      return filterOptions.locations.flatMap((loc) => loc.cities);
    }
    return filterOptions.locations.find((loc) => loc.state === draft.state)?.cities ?? [];
  }, [filterOptions.locations, draft.state]);

  function setState(value: string) {
    const nextState = value || undefined;
    const cities = nextState
      ? (filterOptions.locations.find((loc) => loc.state === nextState)?.cities ?? [])
      : filterOptions.locations.flatMap((loc) => loc.cities);
    const cityStillValid = draft.city ? cities.includes(draft.city) : true;
    onDraftChange({
      ...draft,
      state: nextState,
      city: cityStillValid ? draft.city : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterSelect
        label="Salesman"
        value={draft.salesman ?? ""}
        onChange={(value) => onDraftChange({ ...draft, salesman: value || undefined })}
      >
        <option value="">All salesmen</option>
        {filterOptions.salesmen.map((s) => (
          <option key={s.id} value={s.id}>
            {s.fullName}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect label="State" value={draft.state ?? ""} onChange={setState}>
        <option value="">All states</option>
        {filterOptions.locations.map((loc) => (
          <option key={loc.state} value={loc.state}>
            {loc.state}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="City"
        value={draft.city ?? ""}
        onChange={(value) => onDraftChange({ ...draft, city: value || undefined })}
      >
        <option value="">All cities</option>
        {citiesForState.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Result"
        value={draft.result}
        onChange={(value) => onDraftChange({ ...draft, result: value as VisitActivityResultFilter })}
      >
        {RESULT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Dealer Type"
        value={draft.dealerType}
        onChange={(value) => onDraftChange({ ...draft, dealerType: value as DealerTypeFilter })}
      >
        {DEALER_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Follow-up"
        value={draft.followup}
        onChange={(value) =>
          onDraftChange({ ...draft, followup: value as VisitActivityFollowUpFilter })
        }
      >
        {FOLLOWUP_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </FilterSelect>
    </div>
  );
}

export function VisitActivityFiltersBar({
  filters,
  filterOptions,
  onChange,
}: VisitActivityFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  const [customFrom, setCustomFrom] = useState(filters.from ?? "");
  const [customTo, setCustomTo] = useState(filters.to ?? "");
  const [panelOpen, setPanelOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [draft, setDraft] = useState<AdvancedDraft>(() => toAdvancedDraft(filters));
  const popoverRef = useRef<HTMLDivElement>(null);
  const filtersTriggerRef = useRef<HTMLDivElement>(null);

  const advancedCount = countAdvancedVisitActivityFilters(filters);
  const showDesktopPopover = panelOpen && isDesktop;
  const showMobileSheet = panelOpen && !isDesktop;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setSearchInput(filters.q ?? "");
  }, [filters.q]);

  useEffect(() => {
    setCustomFrom(filters.from ?? "");
    setCustomTo(filters.to ?? "");
  }, [filters.from, filters.to]);

  useEffect(() => {
    if (!panelOpen) {
      setDraft(toAdvancedDraft(filters));
    }
  }, [filters, panelOpen]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextQ = searchInput.trim() || undefined;
      if ((filters.q ?? undefined) === nextQ) return;
      onChange({ ...filters, q: nextQ, page: 1 });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps -- debounce search only

  useEffect(() => {
    if (!showDesktopPopover) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanelOpen(false);
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (filtersTriggerRef.current?.contains(target)) return;
      setPanelOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [showDesktopPopover]);

  function patch(partial: Partial<VisitActivityFilters>) {
    onChange({ ...filters, ...partial, page: 1 });
  }

  function openPanel() {
    setDraft(toAdvancedDraft(filters));
    setPanelOpen(true);
  }

  function handlePeriodChange(period: DateRangePreset) {
    if (period === "custom") {
      patch({
        period,
        from: customFrom || filters.from,
        to: customTo || filters.to,
      });
      return;
    }
    patch({ period, from: undefined, to: undefined });
  }

  function handleCustomFrom(value: string) {
    setCustomFrom(value);
    if (filters.period === "custom" && value && customTo) {
      patch({ period: "custom", from: value, to: customTo });
    }
  }

  function handleCustomTo(value: string) {
    setCustomTo(value);
    if (filters.period === "custom" && customFrom && value) {
      patch({ period: "custom", from: customFrom, to: value });
    }
  }

  function handleApply() {
    onChange({
      ...filters,
      salesman: draft.salesman,
      state: draft.state,
      city: draft.city,
      result: draft.result,
      dealerType: draft.dealerType,
      followup: draft.followup,
      page: 1,
    });
    setPanelOpen(false);
  }

  function handleClearAdvanced() {
    const cleared = clearAdvancedVisitActivityFilters(filters);
    setDraft(toAdvancedDraft(cleared));
    onChange(cleared);
    setPanelOpen(false);
  }

  function handleChipRemove(chipPatch: Partial<VisitActivityFilters>) {
    onChange({ ...filters, ...chipPatch, page: 1 });
  }

  const panelActions = (
    <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
      <Button type="button" variant="ghost" size="sm" onClick={handleClearAdvanced}>
        Clear filters
      </Button>
      <Button type="button" size="sm" onClick={handleApply}>
        Apply
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          size="lg"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search dealer, salesman, phone, city or product"
          className="pl-9"
          aria-label="Search visits"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <VisitDateFilters
          value={filters.period}
          customFrom={customFrom}
          customTo={customTo}
          onChange={handlePeriodChange}
          onCustomFromChange={handleCustomFrom}
          onCustomToChange={handleCustomTo}
        />

        <div className="relative flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="sr-only lg:not-sr-only lg:whitespace-nowrap">Sort</span>
            <select
              value={filters.sort}
              onChange={(e) => patch({ sort: e.target.value as VisitActivitySortOption })}
              className={cn(selectClassName, "w-auto min-w-[8.5rem]")}
              aria-label="Sort visits"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div ref={filtersTriggerRef}>
            <Button
              type="button"
              variant="outline"
              onClick={() => (panelOpen ? setPanelOpen(false) : openPanel())}
              aria-expanded={panelOpen}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filters
              {advancedCount > 0 ? (
                <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">
                  {advancedCount}
                </span>
              ) : null}
            </Button>
          </div>

          {showDesktopPopover ? (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Visit filters"
              className="absolute top-full right-0 z-40 mt-2 w-[340px] rounded-xl border border-border bg-white p-4 shadow-md"
            >
              <h2 className="mb-3 text-sm font-semibold tracking-tight">Filters</h2>
              <AdvancedFilterFields
                draft={draft}
                filterOptions={filterOptions}
                onDraftChange={setDraft}
              />
              <div className="mt-4">{panelActions}</div>
            </div>
          ) : null}
        </div>
      </div>

      <VisitActivityFilterChips
        filters={filters}
        filterOptions={filterOptions}
        onRemove={handleChipRemove}
      />

      <VisitFiltersSheet
        open={showMobileSheet}
        onClose={() => setPanelOpen(false)}
        ariaLabel="Visit activity filters"
      >
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Filters</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPanelOpen(false)}>
              Close
            </Button>
          </div>
          <AdvancedFilterFields
            draft={draft}
            filterOptions={filterOptions}
            onDraftChange={setDraft}
          />
          {panelActions}
        </div>
      </VisitFiltersSheet>
    </div>
  );
}
