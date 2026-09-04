"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchSalesmanFollowupsAction,
  recordFollowupOutcomeAction,
} from "@/app/(salesman)/followups/actions";
import type { GroupedFollowups, FollowupsSummary, SalesmanFollowupItem } from "@/lib/types/followups";
import type { CallOutcome } from "@/lib/types/followups";
import { FollowupsGroupedList } from "./followups-grouped-list";
import { FollowupsEmpty } from "./followups-empty";
import { FollowupsSkeleton } from "./followups-skeleton";
import { FollowupOutcomeSheet } from "./followup-outcome-sheet";

const EMPTY_GROUPED: GroupedFollowups = { overdue: [], dueToday: [], upcoming: [] };

export function FollowupsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grouped, setGrouped] = useState<GroupedFollowups>(EMPTY_GROUPED);
  const [summary, setSummary] = useState<FollowupsSummary>({
    overdue: 0,
    dueToday: 0,
    upcoming: 0,
    total: 0,
  });
  const [selectedFollowup, setSelectedFollowup] = useState<SalesmanFollowupItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadFollowups = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchSalesmanFollowupsAction();
    if (!result.success || !result.grouped || !result.summary) {
      setError(result.error ?? "Couldn't load follow-ups.");
      setGrouped(EMPTY_GROUPED);
      setSummary({ overdue: 0, dueToday: 0, upcoming: 0, total: 0 });
    } else {
      setGrouped(result.grouped);
      setSummary(result.summary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFollowups();
  }, [loadFollowups]);

  function handleRecordOutcome(followup: SalesmanFollowupItem) {
    setSelectedFollowup(followup);
    setSaveError(null);
    setSheetOpen(true);
  }

  function handleCloseSheet() {
    if (saving) return;
    setSheetOpen(false);
    setSelectedFollowup(null);
    setSaveError(null);
  }

  function removeFollowupFromGrouped(followupId: string, state: GroupedFollowups): GroupedFollowups {
    const filter = (items: SalesmanFollowupItem[]) => items.filter((item) => item.id !== followupId);
    return {
      overdue: filter(state.overdue),
      dueToday: filter(state.dueToday),
      upcoming: filter(state.upcoming),
    };
  }

  async function handleSave(payload: {
    followupId: string;
    outcome: CallOutcome;
    note?: string;
    nextDueDate?: string;
  }) {
    setSaving(true);
    setSaveError(null);

    const result = await recordFollowupOutcomeAction(payload);

    if (!result.success) {
      setSaveError(result.error ?? "Could not save outcome.");
      setSaving(false);
      return;
    }

    setGrouped((current) => removeFollowupFromGrouped(payload.followupId, current));
    setSummary((current) => {
      const removed = selectedFollowup;
      if (!removed) return current;
      const bucket = removed.dueBucket;
      return {
        ...current,
        overdue: bucket === "overdue" ? Math.max(0, current.overdue - 1) : current.overdue,
        dueToday: bucket === "due_today" ? Math.max(0, current.dueToday - 1) : current.dueToday,
        upcoming: bucket === "upcoming" ? Math.max(0, current.upcoming - 1) : current.upcoming,
        total: Math.max(0, current.total - 1),
      };
    });

    setSuccessMessage(result.nextFollowupId ? "Saved. Next follow-up scheduled." : "Call outcome saved.");
    setSaving(false);
    setSheetOpen(false);
    setSelectedFollowup(null);
    router.refresh();

    window.setTimeout(() => setSuccessMessage(null), 3000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">
          Call dealers and record outcomes quickly.
        </p>
      </div>

      {!loading && !error && summary.total > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-center">
            <p className="text-lg font-semibold text-red-700">{summary.overdue}</p>
            <p className="text-xs text-red-700/80">Overdue</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-center">
            <p className="text-lg font-semibold text-amber-900">{summary.dueToday}</p>
            <p className="text-xs text-amber-900/80">Due today</p>
          </div>
          <div className="rounded-lg border border-border bg-white px-3 py-2 text-center">
            <p className="text-lg font-semibold">{summary.upcoming}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </div>
        </div>
      ) : null}

      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {loading ? <FollowupsSkeleton /> : null}
      {!loading && error ? <FollowupsEmpty variant="error" onRetry={loadFollowups} /> : null}
      {!loading && !error && summary.total === 0 ? <FollowupsEmpty variant="empty" /> : null}
      {!loading && !error && summary.total > 0 ? (
        <FollowupsGroupedList grouped={grouped} onRecordOutcome={handleRecordOutcome} />
      ) : null}

      <FollowupOutcomeSheet
        open={sheetOpen}
        followup={selectedFollowup}
        loading={saving}
        error={saveError}
        onClose={handleCloseSheet}
        onSave={handleSave}
      />
    </div>
  );
}
