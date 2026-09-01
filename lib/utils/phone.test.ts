import { describe, expect, it } from "vitest";
import {
  normalizeBusinessName,
  normalizeCity,
  normalizeGst,
  normalizeIndianMobile,
  phonesMatch,
} from "./phone";

describe("normalizeIndianMobile", () => {
  it("normalizes common Indian forms to 91XXXXXXXXXX", () => {
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("919876543210");
    expect(normalizeIndianMobile("919876543210")).toBe("919876543210");
    expect(normalizeIndianMobile("09876543210")).toBe("919876543210");
    expect(normalizeIndianMobile("9876543210")).toBe("919876543210");
    expect(normalizeIndianMobile("(98765)-43210")).toBe("919876543210");
  });

  it("returns null for invalid input instead of inventing a number", () => {
    expect(normalizeIndianMobile("")).toBeNull();
    expect(normalizeIndianMobile("12345")).toBeNull();
    expect(normalizeIndianMobile("abcdefghij")).toBeNull();
    expect(normalizeIndianMobile("0876543210")).toBeNull(); // landline-like first digit after 0
    expect(normalizeIndianMobile("911234567890")).toBeNull(); // too long / wrong
  });
});

describe("phonesMatch", () => {
  it("matches equivalent formats", () => {
    expect(phonesMatch("+91 98765 43210", "9876543210")).toBe(true);
    expect(phonesMatch("9876543210", "91234567890")).toBe(false);
  });
});

describe("normalizeGst / name / city", () => {
  it("normalizes GST", () => {
    expect(normalizeGst(" 22aaaaa0000a1z5 ")).toBe("22AAAAA0000A1Z5");
    expect(normalizeGst("")).toBeNull();
  });

  it("normalizes business names", () => {
    expect(normalizeBusinessName("Sharma Auto!")).toBe("sharma auto");
    expect(normalizeBusinessName("  Sharma   Auto  ")).toBe("sharma auto");
  });

  it("normalizes cities", () => {
    expect(normalizeCity("  Indore ")).toBe("indore");
  });
});
