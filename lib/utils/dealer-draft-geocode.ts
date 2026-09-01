import type { DealerDraft } from "@/lib/types/salesman-visit";
import type { GeocodeDetails } from "@/lib/utils/reverse-geocode";

/**
 * Fill empty dealer draft fields from reverse-geocoded GPS data.
 * Never overwrites fields the salesperson has already typed.
 */
export function applyGeocodeToDraft(
  draft: DealerDraft,
  details: GeocodeDetails,
): Partial<DealerDraft> {
  const patch: Partial<DealerDraft> = {};

  if (!draft.city.trim() && details.city) {
    patch.city = details.city;
  }
  if (!draft.state.trim() && details.state) {
    patch.state = details.state;
  }
  if (!draft.pincode.trim() && details.pincode) {
    patch.pincode = details.pincode;
  }
  if (!draft.address.trim() && details.locality) {
    patch.address = details.locality;
  }

  return patch;
}
