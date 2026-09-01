"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchVisitHistoryAction } from "@/app/(salesman)/visit-history/actions";
import { hasActiveFilters } from "@/lib/business/visit-history";
import { sortVisits } from "@/lib/business/visit-history-sort";
import {
  DEFAULT_VISIT_HISTORY_FILTERS,
  type DateRangePreset,
  type DealerTypeFilter,
  type FollowUpFilter,
  type OrderFilter,
  type VisitHistoryFilters,
  type VisitHistoryItem,
  type VisitHistorySummary,
  type VisitSortOption,
} from "@/lib/types/visit-history";
import { ActiveFilterChips } from "./active-filter-chips";
import { VisitSummary } from "./visit-summary";
import { VisitSearch } from "./visit-search";
import { VisitDateFilters } from "./visit-date-filters";
import { VisitFiltersSheet } from "./visit-filters-sheet";
import { VisitFiltersPanel } from "./visit-filters-panel";
import { VisitHistoryGroupedList } from "./visit-history-grouped-list";
import { VisitHistorySkeleton } from "./visit-history-skeleton";
import { VisitHistoryEmpty } from "./visit-history-empty";
import { VisitSortControl } from "./visit-sort-control";

function parseFilters(params: URLSearchParams): VisitHistoryFilters {
  const range = (params.get("range") as DateRangePreset) || DEFAULT_VISIT_HISTORY_FILTERS.range;
  const sort = (params.get("sort") as VisitSortOption) || DEFAULT_VISIT_HISTORY_FILTERS.sort;
  return {
    range: ["today", "week", "month", "custom"].includes(range) ? range : "month",
    from: params.get("from") || undefined,
    to: params.get("to") || undefined,
    q: params.get("q") || undefined,
    order: (params.get("order") as OrderFilter) || "all",
    followUp: (params.get("followup") as FollowUpFilter) || "all",
    dealerType: (params.get("dealerType") as DealerTypeFilter) || "all",
    city: params.get("city") || "all",
    sort: ["newest", "oldest", "order_value", "follow_up_due"].includes(sort) ? sort : "newest",
  };
}

function filtersToParams(filters: VisitHistoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("range", filters.range);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.order !== "all") params.set("order", filters.order);
  if (filters.followUp !== "all") params.set("followup", filters.followUp);
  if (filters.dealerType !== "all") params.set("dealerType", filters.dealerType);
  if (filters.city && filters.city !== "all") params.set("city", filters.city);
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  return params;
}

function filtersEqual(a: VisitHistoryFilters, b: VisitHistoryFilters): boolean {
  return (
    a.range === b.range &&
    a.from === b.from &&
    a.to === b.to &&
    a.q === b.q &&
    a.order === b.order &&
    a.followUp === b.followUp &&
    a.dealerType === b.dealerType &&
    a.city === b.city &&
    a.sort === b.sort
  );
}

export function VisitHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<VisitHistoryFilters>(() => parseFilters(searchParams));
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  const [customFrom, setCustomFrom] = useState(filters.from ?? "");
  const [customTo, setCustomTo] = useState(filters.to ?? "");
  const [items, setItems] = useState<VisitHistoryItem[]>([]);
  const [summary, setSummary] = useState<VisitHistorySummary>({
    totalVisits: 0,
    ordersPlaced: 0,
    noOrder: 0,
    pendingFollowUps: 0,
  });
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const filtersActive = useMemo(() => hasActiveFilters(filters), [filters]);
  const sortedItems = useMemo(() => sortVisits(items, filters.sort), [items, filters.sort]);

  const syncUrl = useCallback(
    (next: VisitHistoryFilters) => {
      const params = filtersToParams(next);
      const query = params.toString();
      const current = searchParams.toString();
      if (query === current) return;

      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadVisits = useCallback(async (nextFilters: VisitHistoryFilters) => {
    setLoading(true);
    setError(false);
    const result = await fetchVisitHistoryAction(nextFilters);
    setLoading(false);
    setHasLoadedOnce(true);

    if (!result.success || !result.items || !result.summary) {
      setError(true);
      setItems([]);
      return;
    }

    setItems(result.items);
    setSummary(result.summary);
    setCities(result.cities ?? []);
  }, []);

  useEffect(() => {
    const parsed = parseFilters(searchParams);
    setFilters((current) => (filtersEqual(current, parsed) ? current : parsed));
    setSearchInput(parsed.q ?? "");
    setCustomFrom(parsed.from ?? "");
    setCustomTo(parsed.to ?? "");
  }, [searchParams]);

  useEffect(() => {
    void loadVisits(filters);
  }, [filters, loadVisits]);

  useEffect(() => {
    syncUrl(filters);
  }, [filters, syncUrl]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const q = searchInput.trim() || undefined;
      setFilters((current) => {
        if (current.q === q) return current;
        return { ...current, q };
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  function updateFilters(patch: Partial<VisitHistoryFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function handleRangeChange(range: DateRangePreset) {
    updateFilters({
      range,
      from: range === "custom" ? customFrom || undefined : undefined,
      to: range === "custom" ? customTo || undefined : undefined,
    });
  }

  function clearFilters() {
    const next = { ...DEFAULT_VISIT_HISTORY_FILTERS, range: filters.range, sort: filters.sort };
    setSearchInput("");
    setFilters(next);
  }

  const hasFiltering =
    filtersActive ||
    filters.range !== "month" ||
    Boolean(searchInput.trim()) ||
    Boolean(customFrom) ||
    Boolean(customTo);

  const showNoResults = hasLoadedOnce && !loading && !error && items.length === 0 && hasFiltering;
  const showEmpty = hasLoadedOnce && !loading && !error && items.length === 0 && !hasFiltering;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">Visit History</h1>

      {!loading && !error ? <VisitSummary summary={summary} /> : null}

      <VisitSearch value={searchInput} onChange={setSearchInput} />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <VisitDateFilters
              value={filters.range}
              customFrom={customFrom}
              customTo={customTo}
              onChange={handleRangeChange}
              onCustomFromChange={(value) => {
                setCustomFrom(value);
                updateFilters({ from: value || undefined, range: "custom" });
              }}
              onCustomToChange={(value) => {
                setCustomTo(value);
                updateFilters({ to: value || undefined, range: "custom" });
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="relative shrink-0 gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {filtersActive ? (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
            ) : null}
          </Button>
        </div>

        <VisitSortControl value={filters.sort} onChange={(sort) => updateFilters({ sort })} />
        <ActiveFilterChips filters={filters} onRemove={updateFilters} />
      </div>

      {loading ? <VisitHistorySkeleton /> : null}
      {error ? <VisitHistoryEmpty variant="error" onRetry={() => void loadVisits(filters)} /> : null}
      {showEmpty ? <VisitHistoryEmpty variant="empty" /> : null}
      {showNoResults ? <VisitHistoryEmpty variant="no-results" onClearFilters={clearFilters} /> : null}

      {!loading && !error && sortedItems.length > 0 ? (
        <VisitHistoryGroupedList visits={sortedItems} />
      ) : null}

      <VisitFiltersSheet open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <VisitFiltersPanel
          order={filters.order}
          followUp={filters.followUp}
          dealerType={filters.dealerType}
          city={filters.city ?? "all"}
          cities={cities}
          onOrderChange={(order) => updateFilters({ order })}
          onFollowUpChange={(followUp) => updateFilters({ followUp })}
          onDealerTypeChange={(dealerType) => updateFilters({ dealerType })}
          onCityChange={(city) => updateFilters({ city })}
          onClear={() => {
            clearFilters();
            setFiltersOpen(false);
          }}
        />
      </VisitFiltersSheet>
    </div>
  );
}
