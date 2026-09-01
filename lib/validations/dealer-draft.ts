import type { DealerDraft } from "@/lib/types/salesman-visit";

export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export type DealerDraftField = "dealerName" | "phone" | "address" | "city" | "pincode";

export type DealerDraftTouched = Record<DealerDraftField, boolean>;

export const EMPTY_DEALER_DRAFT_TOUCHED: DealerDraftTouched = {
  dealerName: false,
  phone: false,
  address: false,
  city: false,
  pincode: false,
};

export function normalizeIndianMobile(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(phone: string): boolean {
  return INDIAN_MOBILE_REGEX.test(normalizeIndianMobile(phone));
}

export function canContinueDealerDraft(draft: DealerDraft): boolean {
  return (
    draft.dealerName.trim().length > 0 &&
    isValidIndianMobile(draft.phone) &&
    draft.address.trim().length > 0 &&
    draft.city.trim().length > 0
  );
}

export function markAllRequiredDealerFieldsTouched(): DealerDraftTouched {
  return {
    dealerName: true,
    phone: true,
    address: true,
    city: true,
    pincode: false,
  };
}

export function getDealerDraftFieldError(
  field: DealerDraftField,
  draft: DealerDraft,
  touched: DealerDraftTouched,
): string | null {
  if (!touched[field]) return null;

  switch (field) {
    case "dealerName":
      return draft.dealerName.trim().length > 0 ? null : "Business name is required";
    case "phone":
      if (draft.phone.replace(/\D/g, "").length === 0) return "Phone number is required";
      return isValidIndianMobile(draft.phone) ? null : "Enter a valid 10-digit mobile number";
    case "address":
      return draft.address.trim().length > 0 ? null : "Address is required";
    case "city":
      return draft.city.trim().length > 0 ? null : "City is required";
    case "pincode":
      if (draft.pincode.length === 0) return null;
      return /^\d{6}$/.test(draft.pincode) ? null : "Pincode must be 6 digits";
    default:
      return null;
  }
}
