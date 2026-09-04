import { z } from "zod";
import type { CallOutcome } from "@/lib/types/followups";
import { buildNextFollowupDraft } from "@/lib/business/followups";

export const CALL_OUTCOMES = [
  "interested",
  "call_again",
  "send_quotation",
  "no_answer",
  "not_interested",
] as const satisfies readonly CallOutcome[];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isDueDateValid(nextDueDate: string, now: Date = new Date()): boolean {
  if (!DATE_PATTERN.test(nextDueDate)) return false;
  const [year, month, day] = nextDueDate.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  return startOfLocalDay(due) >= startOfLocalDay(now);
}

export const recordFollowupOutcomeSchema = z
  .object({
    followupId: z.string().uuid("Invalid follow-up."),
    outcome: z.enum(CALL_OUTCOMES),
    note: z.string().trim().max(500, "Note is too long.").optional(),
    nextDueDate: z
      .string()
      .regex(DATE_PATTERN, "Invalid date.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const draft = buildNextFollowupDraft(data.outcome, "");

    if (draft.requiresNextDate && !data.nextDueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose when to follow up next.",
        path: ["nextDueDate"],
      });
    }

    if (!draft.allowsNextDate && data.nextDueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This outcome does not need a next follow-up.",
        path: ["nextDueDate"],
      });
    }

    if (data.nextDueDate && !isDueDateValid(data.nextDueDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose today or a future date.",
        path: ["nextDueDate"],
      });
    }
  });

export type RecordFollowupOutcomeInput = z.infer<typeof recordFollowupOutcomeSchema>;

export const QUICK_DATE_OFFSETS = {
  tomorrow: 1,
  inTwoDays: 2,
  nextWeek: 7,
} as const;

export type QuickDateOption = keyof typeof QUICK_DATE_OFFSETS;

export function resolveQuickDueDate(option: QuickDateOption, now: Date = new Date()): string {
  return formatLocalDate(addDays(now, QUICK_DATE_OFFSETS[option]));
}
