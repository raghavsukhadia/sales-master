import { describe, expect, it } from "vitest";
import { EMPTY_DEALER_DRAFT } from "@/lib/types/salesman-visit";
import {
  canContinueDealerDraft,
  getDealerDraftFieldError,
  isValidIndianMobile,
  normalizeIndianMobile,
} from "./dealer-draft";

describe("dealer draft validation", () => {
  const validDraft = {
    ...EMPTY_DEALER_DRAFT,
    dealerName: "Sharma Auto",
    phone: "9876543210",
    address: "MG Road",
    city: "Indore",
  };

  it("normalizes Indian mobile numbers", () => {
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("9876543210");
    expect(isValidIndianMobile("9876543210")).toBe(true);
    expect(isValidIndianMobile("5876543210")).toBe(false);
  });

  it("requires business name, phone, address, and city to continue", () => {
    expect(canContinueDealerDraft(validDraft)).toBe(true);
    expect(canContinueDealerDraft({ ...validDraft, city: "" })).toBe(false);
    expect(canContinueDealerDraft({ ...validDraft, address: "" })).toBe(false);
    expect(canContinueDealerDraft({ ...validDraft, phone: "123" })).toBe(false);
  });

  it("shows field errors only after touch", () => {
    const untouched = {
      dealerName: false,
      phone: false,
      address: false,
      city: false,
      pincode: false,
    };

    expect(getDealerDraftFieldError("phone", validDraft, untouched)).toBeNull();

    const touched = { ...untouched, phone: true };
    expect(getDealerDraftFieldError("phone", { ...validDraft, phone: "123" }, touched)).toBe(
      "Enter a valid 10-digit mobile number",
    );
  });
});
