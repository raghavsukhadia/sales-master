"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VisitFiltersSheet } from "@/components/salesman/visit-history/visit-filters-sheet";
import type {
  FollowupManagementFilters,
  FollowupManagementFilterOptions,
  FollowupManagementOutcomeFilter,
  FollowupManagementPriorityFilter,
  FollowupManagementSortOption,
  FollowupManagementStatusTab,
} from "@/lib/types/followup-management";
import {
  clearAdvancedFollowupManagementFilters,
  countAdvancedFollowupManagementFilters,
} from "@/lib/validations/followup-management";
import { cn } from "@/lib/utils";
import { FollowupManagementFilterChips } from "./followup-management-filter-chips";

const STATUS_TABS: { value: FollowupManagementStatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due_today", label: "Due Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

const SORT_OPTIONS: { value: FollowupManagementSortOption; label: string }[] = [
  { value: "due", label: "Due soon" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "priority", label: "Priority" },
  { value: "salesman", label: "Salesman" },
];

const PRIORITY_OPTIONS: { value: FollowupManagementPriorityFilter; label: string }[] = [
  { value: "all", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const OUTCOME_OPTIONS: { value: FollowupManagementOutcomeFilter; label: string }[] = [
  { value: "all", label: "All outcomes" },
  { value: "interested", label: "Interested" },
  { value: "call_again", label: "Call again" },
  { value: "send_quotation", label: "Send quotation" },
  { value: "no_answer", label: "No answer" },
  { value: "not_interested", label: "Not interested" },
];

const selectClassName =
  "h-9 w-full rounded-lg border border-input bg-white px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface AdvancedDraft {
  salesman?: string;
  state?: string;
  city?: string;
  priority: FollowupManagementPriorityFilter;
  outcome: FollowupManagementOutcomeFilter;
  dueFrom?: string;
  dueTo?: string;
}

function toAdvancedDraft(filters: FollowupManagementFilters): AdvancedDraft {
  return {
    salesman: filters.salesman,
    state: filters.state,
    city: filters.city,
    priority: filters.priority,
    outcome: filters.outcome,
    dueFrom: filters.dueFrom,
    dueTo: filters.dueTo,
  };
}

interface FollowupManagementFiltersBarProps {
  filters: FollowupManagementFilters;
  filterOptions: FollowupManagementFilterOptions;
  onChange: (next: FollowupManagementFilters) => void;
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
  filterOptions: FollowupManagementFilterOptions;
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
        label="Priority"
        value={draft.priority}
        onChange={(value) =>
          onDraftChange({ ...draft, priority: value as FollowupManagementPriorityFilter })
        }
      >
        {PRIORITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Outcome"
        value={draft.outcome}
        onChange={(value) =>
          onDraftChange({ ...draft, outcome: value as FollowupManagementOutcomeFilter })
        }
      >
        {OUTCOME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </FilterSelect>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">Due from</span>
          <input
            type="date"
            value={draft.dueFrom ?? ""}
            onChange={(e) => onDraftChange({ ...draft, dueFrom: e.target.value || undefined })}
            className={selectClassName}
            aria-label="Due from"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">Due to</span>
          <input
            type="date"
            value={draft.dueTo ?? ""}
            onChange={(e) => onDraftChange({ ...draft, dueTo: e.target.value || undefined })}
            className={selectClassName}
            aria-label="Due to"
          />
        </label>
      </div>
    </div>
  );
}

export function FollowupManagementFiltersBar({
  filters,
  filterOptions,
  onChange,
}: FollowupManagementFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  const [panelOpen, setPanelOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [draft, setDraft] = useState<AdvancedDraft>(() => toAdvancedDraft(filters));
  const popoverRef = useRef<HTMLDivElement>(null);
  const filtersTriggerRef = useRef<HTMLDivElement>(null);

  const advancedCount = countAdvancedFollowupManagementFilters(filters);
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
    if (!panelOpen) setDraft(toAdvancedDraft(filters));
  }, [filters, panelOpen]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextQ = searchInput.trim() || undefined;
      if ((filters.q ?? undefined) === nextQ) return;
      onChange({ ...filters, q: nextQ, page: 1 });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function patch(partial: Partial<FollowupManagementFilters>) {
    onChange({ ...filters, ...partial, page: 1 });
  }

  function openPanel() {
    setDraft(toAdvancedDraft(filters));
    setPanelOpen(true);
  }

  function handleApply() {
    onChange({
      ...filters,
      salesman: draft.salesman,
      state: draft.state,
      city: draft.city,
      priority: draft.priority,
      outcome: draft.outcome,
      dueFrom: draft.dueFrom,
      dueTo: draft.dueTo,
      page: 1,
    });
    setPanelOpen(false);
  }

  function handleClearAdvanced() {
    const cleared = clearAdvancedFollowupManagementFilters(filters);
    setDraft(toAdvancedDraft(cleared));
    onChange(cleared);
    setPanelOpen(false);
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
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => patch({ status: tab.value })}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filters.status === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          size="lg"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search dealer, salesman, phone or follow-up"
          className="pl-9"
          aria-label="Search follow-ups"
        />
      </div>

      <div className="relative flex shrink-0 items-center justify-end gap-2">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="sr-only lg:not-sr-only">Sort</span>
          <select
            value={filters.sort}
            onChange={(e) => patch({ sort: e.target.value as FollowupManagementSortOption })}
            className={cn(selectClassName, "w-auto min-w-[8.5rem]")}
            aria-label="Sort follow-ups"
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
            aria-label="Follow-up filters"
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

      <FollowupManagementFilterChips
        filters={filters}
        filterOptions={filterOptions}
        onRemove={(patch) => onChange({ ...filters, ...patch, page: 1 })}
      />

      <VisitFiltersSheet
        open={showMobileSheet}
        onClose={() => setPanelOpen(false)}
        ariaLabel="Follow-up filters"
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
