import { describe, expect, it } from "vitest";
import {
  formatDealerAddressBlock,
  formatFollowUpCardLine,
  formatFollowUpLabel,
  formatListLocation,
  formatOrderSummaryLine,
  formatVisitCardDateTime,
  getVisitDateGroupLabel,
  groupVisitsByDateLabel,
} from "./visit-history-format";

describe("formatListLocation", () => {
  it("returns city and state only", () => {
    expect(formatListLocation("Nagpur", "Maharashtra")).toBe("Nagpur, Maharashtra");
    expect(formatListLocation("Nagpur", null)).toBe("Nagpur");
    expect(formatListLocation(null, null)).toBe("—");
  });
});

describe("formatDealerAddressBlock", () => {
  it("avoids repeating city/state when already in address", () => {
    expect(
      formatDealerAddressBlock("Shop No. 16, Wardhaman Nagar, Nagpur, Maharashtra", "Nagpur", "Maharashtra"),
    ).toEqual({
      addressLine: "Shop No. 16, Wardhaman Nagar, Nagpur, Maharashtra",
      locationLine: null,
    });
  });

  it("shows location line when address is missing", () => {
    expect(formatDealerAddressBlock(null, "Nagpur", "Maharashtra")).toEqual({
      addressLine: null,
      locationLine: "Nagpur, Maharashtra",
    });
  });
});

describe("formatOrderSummaryLine", () => {
  it("formats first line and count", () => {
    expect(formatOrderSummaryLine([{ productName: "PPF", quantity: 100, unit: "pcs" }])).toBe(
      "PPF · 100 pcs",
    );
    expect(
      formatOrderSummaryLine([
        { productName: "PPF", quantity: 100 },
        { productName: "Ceramic", quantity: 2 },
      ]),
    ).toBe("PPF · 100 pcs +1 more");
  });
});

describe("formatVisitCardDateTime", () => {
  it("returns absolute date and time with middle dot separator", () => {
    const result = formatVisitCardDateTime("2026-09-01T10:35:00.000Z");
    expect(result).toContain(" · ");
    expect(result).toMatch(/01 .* 2026 · \d{1,2}:\d{2}/);
  });
});

describe("formatFollowUpCardLine", () => {
  it("returns empty-state copy when no active follow-up", () => {
    expect(formatFollowUpCardLine("none", null)).toBe("No follow-up scheduled");
    expect(formatFollowUpCardLine("completed", "2026-09-05")).toBe("No follow-up scheduled");
    expect(formatFollowUpCardLine("pending", null)).toBe("No follow-up scheduled");
  });

  it("returns next follow-up line with short date for pending or overdue", () => {
    expect(formatFollowUpCardLine("pending", "2026-09-05")).toBe("Next follow-up · 5 Sept 2026");
    expect(formatFollowUpCardLine("overdue", "2026-09-04")).toBe("Next follow-up · 4 Sept 2026");
  });
});

describe("formatFollowUpLabel", () => {
  const now = new Date("2026-09-05T10:00:00Z");

  it("returns relative follow-up labels", () => {
    expect(formatFollowUpLabel("none", null, now)).toBe("No follow-up");
    expect(formatFollowUpLabel("pending", "2026-09-06", now)).toBe("Follow-up tomorrow");
    expect(formatFollowUpLabel("overdue", "2026-09-03", now)).toBe("Overdue by 2 days");
  });
});

describe("groupVisitsByDateLabel", () => {
  it("groups visits under readable labels", () => {
    const now = new Date("2026-09-05T10:00:00Z");
    const groups = groupVisitsByDateLabel(
      [
        { visitedAt: "2026-09-05T08:00:00Z", id: "1" },
        { visitedAt: "2026-09-04T08:00:00Z", id: "2" },
      ],
      now,
    );

    expect(groups[0]?.label).toBe("Today");
    expect(groups[1]?.label).toBe("Yesterday");
  });

  it("uses month label for older visits", () => {
    const now = new Date("2026-09-05T10:00:00Z");
    expect(getVisitDateGroupLabel("2026-08-10T08:00:00Z", now)).toBe("August");
  });
});
