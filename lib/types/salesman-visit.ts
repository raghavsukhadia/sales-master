import type { DealerSearchResult } from "@/lib/business/dealers";
import type { CapturedLocation } from "@/lib/utils/reverse-geocode";

export type DealerEntryMode = "scan" | "manual" | "search";

export interface DealerDraft {
  dealerName: string;
  phone: string;
  phones: string[];
  primaryPhoneIndex: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  location: CapturedLocation | null;
}

export type ResolvedDealer =
  | { source: "existing"; dealerId: string; snapshot: DealerSearchResult }
  | { source: "new"; draft: DealerDraft }
  | null;

export type VisitStep = 1 | 2 | "success";

export const EMPTY_DEALER_DRAFT: DealerDraft = {
  dealerName: "",
  phone: "",
  phones: [],
  primaryPhoneIndex: 0,
  address: "",
  city: "",
  state: "",
  pincode: "",
  location: null,
};

export function draftFromFields(fields: {
  dealerName?: string;
  phone?: string;
  phones?: string[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): DealerDraft {
  const phones = fields.phones?.length
    ? fields.phones
    : fields.phone
      ? [fields.phone]
      : [];
  return {
    dealerName: fields.dealerName ?? "",
    phone: phones[0] ?? fields.phone ?? "",
    phones,
    primaryPhoneIndex: 0,
    address: fields.address ?? "",
    city: fields.city ?? "",
    state: fields.state ?? "",
    pincode: fields.pincode ?? "",
    location: null,
  };
}

export function getGreetingName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
