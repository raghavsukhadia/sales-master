import { describe, expect, it } from "vitest";
import {
  resolveBusinessDate,
  calendarDateInTimeZone,
  formatCalendarDate,
  BUSINESS_TIMEZONE,
} from "./whatsapp-date-resolution";

/** 2026-08-20 12:00 IST = 2026-08-20 06:30 UTC */
const REF_AUG_20 = "2026-08-20T06:30:00.000Z";

/** 2026-12-31 23:30 IST = 2026-12-31 18:00 UTC */
const REF_YEAR_END = "2026-12-31T18:00:00.000Z";

/** 2026-01-01 00:30 IST = 2025-12-31 19:00 UTC */
const REF_YEAR_START = "2025-12-31T19:00:00.000Z";

describe("calendarDateInTimeZone", () => {
  it("uses Asia/Kolkata calendar day near UTC midnight", () => {
    // 2026-08-19 20:00 UTC = 2026-08-20 01:30 IST
    const d = calendarDateInTimeZone("2026-08-19T20:00:00.000Z", BUSINESS_TIMEZONE);
    expect(formatCalendarDate(d)).toBe("2026-08-20");
  });
});

describe("resolveBusinessDate", () => {
  it("resolves today / aaj", () => {
    expect(resolveBusinessDate("today", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-20",
    });
    expect(resolveBusinessDate("aaj", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-20",
    });
  });

  it("resolves tomorrow", () => {
    expect(resolveBusinessDate("tomorrow", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-21",
    });
  });

  it("treats kal as ambiguous", () => {
    expect(resolveBusinessDate("kal", REF_AUG_20)).toMatchObject({
      status: "ambiguous",
      value: null,
    });
  });

  it("resolves yesterday", () => {
    expect(resolveBusinessDate("yesterday", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-19",
    });
  });

  it("resolves next Monday from Thursday 2026-08-20", () => {
    // 2026-08-20 is Thursday → next Monday = 2026-08-24
    expect(resolveBusinessDate("next Monday", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-24",
    });
  });

  it("resolves this Friday within the week", () => {
    // Thu 20 Aug → this Friday = 21 Aug
    expect(resolveBusinessDate("this Friday", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-21",
    });
  });

  it("resolves explicit ISO date", () => {
    expect(resolveBusinessDate("2026-09-01", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-09-01",
    });
  });

  it("resolves DD/MM India-first", () => {
    expect(resolveBusinessDate("25/08", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-25",
    });
    expect(resolveBusinessDate("25/08/2026", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-25",
    });
  });

  it("resolves day-month text", () => {
    expect(resolveBusinessDate("25 Aug", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-25",
    });
    expect(resolveBusinessDate("August 25", REF_AUG_20)).toMatchObject({
      status: "resolved",
      value: "2026-08-25",
    });
  });

  it("rejects invalid calendar dates", () => {
    expect(resolveBusinessDate("2026-02-30", REF_AUG_20).status).toBe("unresolved");
    expect(resolveBusinessDate("31/02", REF_AUG_20).status).toBe("unresolved");
  });

  it("returns unresolved for unrecognized text", () => {
    expect(resolveBusinessDate("sometime soon", REF_AUG_20)).toMatchObject({
      status: "unresolved",
      value: null,
    });
  });

  it("returns unresolved for empty text", () => {
    expect(resolveBusinessDate(null, REF_AUG_20).status).toBe("unresolved");
    expect(resolveBusinessDate("  ", REF_AUG_20).status).toBe("unresolved");
  });

  it("handles month/year boundary with tomorrow", () => {
    expect(resolveBusinessDate("tomorrow", REF_YEAR_END)).toMatchObject({
      status: "resolved",
      value: "2027-01-01",
    });
  });

  it("handles year start with yesterday", () => {
    expect(resolveBusinessDate("yesterday", REF_YEAR_START)).toMatchObject({
      status: "resolved",
      value: "2025-12-31",
    });
  });

  it("next Monday near year boundary", () => {
    // 2026-12-31 is Thursday → next Monday = 2027-01-04
    expect(resolveBusinessDate("next Monday", REF_YEAR_END)).toMatchObject({
      status: "resolved",
      value: "2027-01-04",
    });
  });
});
