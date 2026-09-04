"use client";

import { FollowupDateQuickPicks } from "@/components/salesman/followups/followup-date-quick-picks";
import { cn } from "@/lib/utils";
import type { QuickDateOption } from "@/lib/validations/followup-outcome";
import { resolveQuickDueDate } from "@/lib/validations/followup-outcome";
import {
  VISIT_NEXT_ACTION_OPTIONS,
  type VisitNextActionType,
} from "@/lib/validations/visit-next-action";

export interface NextActionState {
  type: VisitNextActionType;
  dueQuick: QuickDateOption | "custom" | null;
  customDate: string;
  dueDate: string;
  note: string;
  customDescription: string;
}

export const EMPTY_NEXT_ACTION_STATE: NextActionState = {
  type: "none",
  dueQuick: null,
  customDate: "",
  dueDate: "",
  note: "",
  customDescription: "",
};

interface NextActionSectionProps {
  value: NextActionState;
  onChange: (next: NextActionState) => void;
}

export function NextActionSection({ value, onChange }: NextActionSectionProps) {
  function selectType(type: VisitNextActionType) {
    if (type === "none") {
      onChange({
        ...EMPTY_NEXT_ACTION_STATE,
        type: "none",
      });
      return;
    }

    onChange({
      ...value,
      type,
      customDescription: type === "other" ? value.customDescription : "",
    });
  }

  function selectQuick(option: QuickDateOption) {
    onChange({
      ...value,
      dueQuick: option,
      customDate: "",
      dueDate: resolveQuickDueDate(option),
    });
  }

  function selectCustom() {
    onChange({
      ...value,
      dueQuick: "custom",
      dueDate: value.customDate,
    });
  }

  function changeCustomDate(customDate: string) {
    onChange({
      ...value,
      dueQuick: "custom",
      customDate,
      dueDate: customDate,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold tracking-tight">What should you do next?</h2>
        <div className="grid grid-cols-2 gap-2">
          {VISIT_NEXT_ACTION_OPTIONS.map((option) => {
            const isActive = value.type === option.type;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => selectType(option.type)}
                className={cn(
                  "min-h-12 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  option.type === "none" ? "col-span-2" : "",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-white text-foreground hover:bg-muted/50",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {value.type !== "none" ? (
        <div className="flex flex-col gap-4">
          <FollowupDateQuickPicks
            title="When?"
            selected={value.dueQuick}
            customDate={value.customDate}
            onSelectQuick={selectQuick}
            onSelectCustom={selectCustom}
            onCustomDateChange={changeCustomDate}
          />

          {value.type === "other" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="next-action-other" className="text-sm font-medium">
                What to do
              </label>
              <input
                id="next-action-other"
                type="text"
                value={value.customDescription}
                onChange={(event) =>
                  onChange({ ...value, customDescription: event.target.value })
                }
                placeholder="e.g. Confirm installation date"
                maxLength={200}
                className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor="next-action-note" className="text-sm font-medium text-muted-foreground">
              Add a note <span className="font-normal">(optional)</span>
            </label>
            <textarea
              id="next-action-note"
              value={value.note}
              onChange={(event) => onChange({ ...value, note: event.target.value })}
              placeholder="e.g. Dealer asked for revised PPF pricing."
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
