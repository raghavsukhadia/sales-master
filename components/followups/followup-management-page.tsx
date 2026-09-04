"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type {
  FollowupManagementFilters,
  FollowupManagementItem,
  FollowupManagementListResult,
  FollowupTimelineEvent,
} from "@/lib/types/followup-management";
import { DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS } from "@/lib/types/followup-management";
import {
  followupManagementFiltersToParams,
  hasActiveFollowupManagementFilters,
} from "@/lib/validations/followup-management";
import { fetchFollowupDetailAction } from "@/app/(dashboard)/followups-management/actions";
import { FollowupManagementSummaryStrip } from "./followup-management-summary";
import { FollowupManagementFiltersBar } from "./followup-management-filters";
import { FollowupManagementTable } from "./followup-management-table";
import { FollowupManagementPagination } from "./followup-management-pagination";
import { FollowupManagementEmpty } from "./followup-management-empty";
import { FollowupManagementDetailDrawer } from "./followup-management-detail";

interface FollowupManagementPageClientProps {
  initialFilters: FollowupManagementFilters;
  initialResult: FollowupManagementListResult;
  errorMessage?: string | null;
}

export function FollowupManagementPageClient({
  initialFilters,
  initialResult,
  errorMessage,
}: FollowupManagementPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<FollowupManagementItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [timeline, setTimeline] = useState<FollowupTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const filters = initialFilters;

  const navigateWithFilters = useCallback(
    (next: FollowupManagementFilters) => {
      const params = followupManagementFiltersToParams(next);
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  function handleReset() {
    navigateWithFilters({ ...DEFAULT_FOLLOWUP_MANAGEMENT_FILTERS });
  }

  function buildPageHref(page: number) {
    const params = followupManagementFiltersToParams({ ...filters, page });
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  async function handleView(item: FollowupManagementItem) {
    setSelected(item);
    setDrawerOpen(true);
    setTimelineLoading(true);
    setTimeline([]);
    const result = await fetchFollowupDetailAction(item.id);
    setTimelineLoading(false);
    if (result.success && result.detail) {
      setSelected(result.detail);
      setTimeline(result.detail.timeline);
    }
  }

  const showEmpty = !errorMessage && initialResult.totalCount === 0;
  const filtersActive = hasActiveFollowupManagementFilters(filters);

  const emptyMessage =
    filters.status === "overdue"
      ? "No overdue follow-ups."
      : filters.status === "due_today"
        ? "No follow-ups due today."
        : filters.status === "upcoming"
          ? "No upcoming follow-ups."
          : filters.status === "completed"
            ? "No completed follow-ups."
            : "No follow-ups found for the selected filters.";

  return (
    <div className={isPending ? "opacity-70 transition-opacity" : undefined}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Follow-up Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track salesman follow-up activity, outcomes and pending actions
          </p>
        </div>
        <Button type="button" variant="outline" disabled title="Export coming soon">
          Export
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <FollowupManagementSummaryStrip summary={initialResult.summary} />

        <FollowupManagementFiltersBar
          filters={filters}
          filterOptions={initialResult.filterOptions}
          onChange={navigateWithFilters}
        />

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}

        {showEmpty ? (
          <FollowupManagementEmpty
            message={emptyMessage}
            onReset={filtersActive ? handleReset : undefined}
          />
        ) : !errorMessage ? (
          <>
            <FollowupManagementTable items={initialResult.items} onView={handleView} />
            <FollowupManagementPagination
              page={initialResult.page}
              totalPages={initialResult.totalPages}
              totalCount={initialResult.totalCount}
              pageSize={initialResult.pageSize}
              buildHref={buildPageHref}
            />
          </>
        ) : null}
      </div>

      <FollowupManagementDetailDrawer
        item={selected}
        timeline={timeline}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        loadingTimeline={timelineLoading}
      />
    </div>
  );
}
