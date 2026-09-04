import { describe, expect, it } from "vitest";
import {
  buildVisitFollowupDescription,
  formatNextActionSummary,
  isNextActionReadyToSave,
  visitNextActionSchema,
} from "./visit-next-action";

describe("visitNextActionSchema", () => {
  it("accepts none without due date", () => {
    const result = visitNextActionSchema.safeParse({ type: "none" });
    expect(result.success).toBe(true);
  });

  it("requires due date for predefined actions", () => {
    const result = visitNextActionSchema.safeParse({ type: "call_dealer" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("dueDate");
    }
  });

  it("accepts call_dealer with a future due date", () => {
    const result = visitNextActionSchema.safeParse({
      type: "call_dealer",
      dueDate: "2099-01-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects past due dates", () => {
    const result = visitNextActionSchema.safeParse({
      type: "send_quotation",
      dueDate: "2020-01-01",
    });
    expect(result.success).toBe(false);
  });

  it("requires custom description for other", () => {
    const result = visitNextActionSchema.safeParse({
      type: "other",
      dueDate: "2099-01-15",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("customDescription"))).toBe(true);
    }
  });

  it("accepts other with custom description and due date", () => {
    const result = visitNextActionSchema.safeParse({
      type: "other",
      dueDate: "2099-01-15",
      customDescription: "Confirm installation date",
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes longer than 500 characters", () => {
    const result = visitNextActionSchema.safeParse({
      type: "call_dealer",
      dueDate: "2099-01-15",
      note: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("buildVisitFollowupDescription", () => {
  it("maps predefined actions to labels", () => {
    expect(buildVisitFollowupDescription("call_dealer")).toBe("Call dealer");
    expect(buildVisitFollowupDescription("send_quotation")).toBe("Send quotation");
    expect(buildVisitFollowupDescription("send_sample")).toBe("Send sample");
    expect(buildVisitFollowupDescription("revisit_dealer")).toBe("Revisit dealer");
    expect(buildVisitFollowupDescription("collect_payment")).toBe("Collect payment");
  });

  it("uses custom description for other", () => {
    expect(buildVisitFollowupDescription("other", "Confirm installation date")).toBe(
      "Confirm installation date",
    );
  });

  it("appends optional note with an em dash", () => {
    expect(
      buildVisitFollowupDescription("call_dealer", undefined, "Dealer asked for revised PPF pricing."),
    ).toBe("Call dealer — Dealer asked for revised PPF pricing.");
  });

  it("appends note to other custom description", () => {
    expect(
      buildVisitFollowupDescription("other", "Confirm date", "Call after 5pm"),
    ).toBe("Confirm date — Call after 5pm");
  });
});

describe("formatNextActionSummary", () => {
  const now = new Date("2026-09-03T12:00:00");

  it("formats tomorrow", () => {
    expect(formatNextActionSummary("call_dealer", "2026-09-04", undefined, now)).toBe(
      "Call dealer tomorrow",
    );
  });

  it("formats in 2 days", () => {
    expect(formatNextActionSummary("send_sample", "2026-09-05", undefined, now)).toBe(
      "Send sample in 2 days",
    );
  });

  it("formats next week", () => {
    expect(formatNextActionSummary("revisit_dealer", "2026-09-10", undefined, now)).toBe(
      "Revisit dealer next week",
    );
  });
});

describe("isNextActionReadyToSave", () => {
  it("allows none without due date", () => {
    expect(isNextActionReadyToSave({ type: "none" })).toBe(true);
  });

  it("requires due date for actions", () => {
    expect(isNextActionReadyToSave({ type: "call_dealer" })).toBe(false);
    expect(isNextActionReadyToSave({ type: "call_dealer", dueDate: "2099-01-01" })).toBe(true);
  });

  it("requires custom description for other", () => {
    expect(
      isNextActionReadyToSave({ type: "other", dueDate: "2099-01-01" }),
    ).toBe(false);
    expect(
      isNextActionReadyToSave({
        type: "other",
        dueDate: "2099-01-01",
        customDescription: "Confirm date",
      }),
    ).toBe(true);
  });
});
