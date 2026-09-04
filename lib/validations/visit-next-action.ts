import { z } from "zod";
import { isDueDateValid } from "@/lib/validations/followup-outcome";

export const VISIT_NEXT_ACTION_TYPES = [
  "none",
  "call_dealer",
  "send_quotation",
  "send_sample",
  "revisit_dealer",
  "collect_payment",
  "other",
] as const;

export type VisitNextActionType = (typeof VISIT_NEXT_ACTION_TYPES)[number];

export const VISIT_NEXT_ACTION_OPTIONS: {
  type: VisitNextActionType;
  label: string;
}[] = [
  { type: "none", label: "Nothing" },
  { type: "call_dealer", label: "Call dealer" },
  { type: "send_quotation", label: "Send quotation" },
  { type: "send_sample", label: "Send sample" },
  { type: "revisit_dealer", label: "Revisit dealer" },
  { type: "collect_payment", label: "Collect payment" },
  { type: "other", label: "Other" },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ACTION_DESCRIPTIONS: Record<Exclude<VisitNextActionType, "none" | "other">, string> = {
  call_dealer: "Call dealer",
  send_quotation: "Send quotation",
  send_sample: "Send sample",
  revisit_dealer: "Revisit dealer",
  collect_payment: "Collect payment",
};

export function visitNextActionLabel(type: VisitNextActionType): string {
  return VISIT_NEXT_ACTION_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

/**
 * Build the pending follow-up description from a visit next-action selection.
 * Optional note is appended with an em dash; never written to completion_notes.
 */
export function buildVisitFollowupDescription(
  type: Exclude<VisitNextActionType, "none">,
  customDescription?: string,
  note?: string,
): string {
  const base =
    type === "other"
      ? (customDescription?.trim() || "Other")
      : ACTION_DESCRIPTIONS[type];

  const trimmedNote = note?.trim();
  if (!trimmedNote) return base;
  return `${base} — ${trimmedNote}`;
}

/** Human summary for the success screen, e.g. "Call dealer tomorrow". */
export function formatNextActionSummary(
  type: Exclude<VisitNextActionType, "none">,
  dueDate: string,
  customDescription?: string,
  now: Date = new Date(),
): string {
  const actionLabel =
    type === "other"
      ? customDescription?.trim() || "Other"
      : ACTION_DESCRIPTIONS[type];

  const dueLabel = formatRelativeDueLabel(dueDate, now);
  return dueLabel ? `${actionLabel} ${dueLabel}` : actionLabel;
}

function formatRelativeDueLabel(dueDate: string, now: Date): string | null {
  if (!DATE_PATTERN.test(dueDate)) return null;

  const [year, month, day] = dueDate.split("-").map(Number);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === 2) return "in 2 days";
  if (diffDays === 7) return "next week";

  return `on ${due.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })}`;
}

export const visitNextActionSchema = z
  .object({
    type: z.enum(VISIT_NEXT_ACTION_TYPES),
    dueDate: z
      .string()
      .regex(DATE_PATTERN, "Invalid date.")
      .optional(),
    note: z.string().trim().max(500, "Note is too long.").optional(),
    customDescription: z
      .string()
      .trim()
      .max(200, "Description is too long.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "none") {
      return;
    }

    if (!data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose when to follow up.",
        path: ["dueDate"],
      });
    } else if (!isDueDateValid(data.dueDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose today or a future date.",
        path: ["dueDate"],
      });
    }

    if (data.type === "other") {
      const custom = data.customDescription?.trim() ?? "";
      if (!custom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Describe what to do next.",
          path: ["customDescription"],
        });
      }
    }
  });

export type VisitNextActionInput = z.infer<typeof visitNextActionSchema>;

export function isNextActionReadyToSave(input: {
  type: VisitNextActionType;
  dueDate?: string;
  customDescription?: string;
}): boolean {
  if (input.type === "none") return true;
  if (!input.dueDate || !isDueDateValid(input.dueDate)) return false;
  if (input.type === "other" && !(input.customDescription?.trim())) return false;
  return true;
}
