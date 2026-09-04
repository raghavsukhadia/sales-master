"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { buildNextFollowupDraft } from "@/lib/business/followups";
import type { CallOutcome, SalesmanFollowupItem } from "@/lib/types/followups";
import {
  CALL_OUTCOMES,
  resolveQuickDueDate,
  type QuickDateOption,
} from "@/lib/validations/followup-outcome";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StickyFormCta } from "@/components/salesman/sticky-form-cta";
import { FollowupDateQuickPicks } from "./followup-date-quick-picks";
import { VisitFiltersSheet } from "@/components/salesman/visit-history/visit-filters-sheet";

const OUTCOME_LABELS: Record<CallOutcome, string> = {
  interested: "Interested",
  call_again: "Call Again",
  send_quotation: "Send Quotation",
  no_answer: "No Answer",
  not_interested: "Not Interested",
};

interface FollowupOutcomeSheetProps {
  open: boolean;
  followup: SalesmanFollowupItem | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (payload: {
    followupId: string;
    outcome: CallOutcome;
    note?: string;
    nextDueDate?: string;
  }) => void;
}

export function FollowupOutcomeSheet({
  open,
  followup,
  loading,
  error,
  onClose,
  onSave,
}: FollowupOutcomeSheetProps) {
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [note, setNote] = useState("");
  const [quickPick, setQuickPick] = useState<QuickDateOption | "custom" | null>(null);
  const [customDate, setCustomDate] = useState("");

  useEffect(() => {
    if (!open) {
      setOutcome(null);
      setNote("");
      setQuickPick(null);
      setCustomDate("");
    }
  }, [open]);

  const draft = useMemo(
    () => (outcome ? buildNextFollowupDraft(outcome, followup?.description ?? "") : null),
    [outcome, followup?.description],
  );

  const showDatePicker = draft?.requiresNextDate || draft?.allowsNextDate;

  const resolvedNextDueDate = useMemo(() => {
    if (!showDatePicker || !quickPick) return undefined;
    if (quickPick === "custom") return customDate || undefined;
    return resolveQuickDueDate(quickPick);
  }, [showDatePicker, quickPick, customDate]);

  const canSave = Boolean(followup && outcome && (!draft?.requiresNextDate || resolvedNextDueDate));

  function handleSave() {
    if (!followup || !outcome) return;
    onSave({
      followupId: followup.id,
      outcome,
      note: note.trim() || undefined,
      nextDueDate: resolvedNextDueDate,
    });
  }

  return (
    <VisitFiltersSheet open={open} onClose={onClose}>
      <div className="flex flex-col gap-4 px-4 pb-28 pt-4">
        <div>
          <h2 className="text-lg font-semibold">How did it go?</h2>
          {followup ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {followup.dealerName}
              {followup.city ? ` · ${followup.city}` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Outcome</p>
          <div className="grid grid-cols-2 gap-2">
            {CALL_OUTCOMES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setOutcome(value);
                  const nextDraft = buildNextFollowupDraft(value, followup?.description ?? "");
                  if (nextDraft.requiresNextDate) {
                    setQuickPick("tomorrow");
                    setCustomDate("");
                  } else if (!nextDraft.allowsNextDate) {
                    setQuickPick(null);
                    setCustomDate("");
                  }
                }}
                className={cn(
                  "min-h-11 rounded-lg border px-3 text-sm font-medium transition-colors",
                  outcome === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-white hover:bg-muted/50",
                )}
              >
                {OUTCOME_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="followup-note">Optional note</Label>
          <Textarea
            id="followup-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Dealer wants revised PPF pricing."
            rows={2}
            maxLength={500}
          />
        </div>

        {showDatePicker ? (
          <FollowupDateQuickPicks
            selected={quickPick}
            customDate={customDate}
            onSelectQuick={(option) => {
              setQuickPick(option);
            }}
            onSelectCustom={() => setQuickPick("custom")}
            onCustomDateChange={setCustomDate}
          />
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>

      <StickyFormCta
        label="Save"
        loading={loading}
        disabled={!canSave}
        onClick={handleSave}
        secondaryLabel="Cancel"
        onSecondaryClick={onClose}
      />
    </VisitFiltersSheet>
  );
}
