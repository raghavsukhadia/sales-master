"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type {
  VisitActivityFilters,
  VisitActivityFilterOptions,
  VisitActivityItem,
  VisitActivityListResult,
  VisitActivitySummary,
} from "@/lib/types/visit-activity";
import { DEFAULT_VISIT_ACTIVITY_FILTERS } from "@/lib/types/visit-activity";
import {
  hasActiveVisitActivityFilters,
  visitActivityFiltersToParams,
} from "@/lib/validations/visit-activity";
import { VisitActivitySummaryStrip } from "./visit-activity-summary";
import { VisitActivityFiltersBar } from "./visit-activity-filters";
import { VisitActivityTable } from "./visit-activity-table";
import { VisitActivityPagination } from "./visit-activity-pagination";
import { VisitActivityEmpty } from "./visit-activity-empty";
import { VisitActivityQuickView } from "./visit-activity-quick-view";

interface VisitActivityPageProps {
  initialFilters: VisitActivityFilters;
  initialResult: VisitActivityListResult;
  errorMessage?: string | null;
}

export function VisitActivityPageClient({
  initialFilters,
  initialResult,
  errorMessage,
}: VisitActivityPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [selectedVisit, setSelectedVisit] = useState<VisitActivityItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filters = initialFilters;
  const summary: VisitActivitySummary = initialResult.summary;
  const filterOptions: VisitActivityFilterOptions = initialResult.filterOptions;

  const navigateWithFilters = useCallback(
    (next: VisitActivityFilters) => {
      const params = visitActivityFiltersToParams(next);
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  function handleReset() {
    navigateWithFilters({ ...DEFAULT_VISIT_ACTIVITY_FILTERS });
  }

  function buildPageHref(page: number) {
    const params = visitActivityFiltersToParams({ ...filters, page });
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function handleView(visit: VisitActivityItem) {
    setSelectedVisit(visit);
    setDrawerOpen(true);
  }

  const showEmpty = !errorMessage && initialResult.totalCount === 0;
  const filtersActive = hasActiveVisitActivityFilters(filters);

  return (
    <div className={isPending ? "opacity-70 transition-opacity" : undefined}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visit Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor field visits across all salesmen
          </p>
        </div>
        <Button type="button" variant="outline" disabled title="Export coming soon">
          Export
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <VisitActivitySummaryStrip summary={summary} />

        <VisitActivityFiltersBar
          filters={filters}
          filterOptions={filterOptions}
          onChange={navigateWithFilters}
          onReset={handleReset}
        />

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {showEmpty ? (
          <VisitActivityEmpty onReset={filtersActive ? handleReset : undefined} />
        ) : !errorMessage ? (
          <>
            <VisitActivityTable visits={initialResult.items} onView={handleView} />
            <VisitActivityPagination
              page={initialResult.page}
              totalPages={initialResult.totalPages}
              totalCount={initialResult.totalCount}
              buildHref={buildPageHref}
            />
          </>
        ) : null}
      </div>

      <VisitActivityQuickView
        visit={selectedVisit}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
