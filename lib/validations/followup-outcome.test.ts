import { describe, expect, it } from "vitest";
import {
  addDays,
  formatLocalDate,
  isDueDateValid,
  recordFollowupOutcomeSchema,
  resolveQuickDueDate,
} from "./followup-outcome";

describe("recordFollowupOutcomeSchema", () => {
  const followupId = "11111111-1111-4111-8111-111111111111";
  const today = new Date("2026-09-02T10:00:00");
  const tomorrow = formatLocalDate(addDays(today, 1));

  it("requires nextDueDate for call_again", () => {
    const result = recordFollowupOutcomeSchema.safeParse({
      followupId,
      outcome: "call_again",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid call_again with next date", () => {
    const result = recordFollowupOutcomeSchema.safeParse({
      followupId,
      outcome: "call_again",
      nextDueDate: tomorrow,
    });
    expect(result.success).toBe(true);
  });

  it("rejects next date for not_interested", () => {
    const result = recordFollowupOutcomeSchema.safeParse({
      followupId,
      outcome: "not_interested",
      nextDueDate: tomorrow,
    });
    expect(result.success).toBe(false);
  });

  it("allows interested without next date", () => {
    const result = recordFollowupOutcomeSchema.safeParse({
      followupId,
      outcome: "interested",
    });
    expect(result.success).toBe(true);
  });

  it("rejects past nextDueDate", () => {
    const result = recordFollowupOutcomeSchema.safeParse({
      followupId,
      outcome: "no_answer",
      nextDueDate: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects note over 500 chars", () => {
    const result = recordFollowupOutcomeSchema.safeParse({
      followupId,
      outcome: "not_interested",
      note: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("resolveQuickDueDate", () => {
  const now = new Date("2026-09-02T10:00:00");

  it("resolves quick options", () => {
    expect(resolveQuickDueDate("tomorrow", now)).toBe("2026-09-03");
    expect(resolveQuickDueDate("inTwoDays", now)).toBe("2026-09-04");
    expect(resolveQuickDueDate("nextWeek", now)).toBe("2026-09-09");
  });
});

describe("isDueDateValid", () => {
  const now = new Date("2026-09-02T10:00:00");

  it("allows today and future", () => {
    expect(isDueDateValid("2026-09-02", now)).toBe(true);
    expect(isDueDateValid("2026-09-03", now)).toBe(true);
  });

  it("rejects past", () => {
    expect(isDueDateValid("2026-09-01", now)).toBe(false);
  });
});
