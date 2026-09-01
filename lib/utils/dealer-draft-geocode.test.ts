import { describe, expect, it } from "vitest";
import { EMPTY_DEALER_DRAFT } from "@/lib/types/salesman-visit";
import { applyGeocodeToDraft } from "./dealer-draft-geocode";

describe("applyGeocodeToDraft", () => {
  it("fills empty city, state, and pincode from geocode details", () => {
    const patch = applyGeocodeToDraft(EMPTY_DEALER_DRAFT, {
      locality: "Wardhaman Nagar",
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440008",
    });

    expect(patch).toEqual({
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440008",
      address: "Wardhaman Nagar",
    });
  });

  it("does not overwrite address when the user already typed one", () => {
    const draft = {
      ...EMPTY_DEALER_DRAFT,
      address: "Shop No. 16, MSB School Compound",
    };

    const patch = applyGeocodeToDraft(draft, {
      locality: "Wardhaman Nagar",
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440008",
    });

    expect(patch).toEqual({
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440008",
    });
    expect(patch.address).toBeUndefined();
  });

  it("does not overwrite fields that already have values", () => {
    const draft = {
      ...EMPTY_DEALER_DRAFT,
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452001",
    };

    const patch = applyGeocodeToDraft(draft, {
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440008",
    });

    expect(patch).toEqual({});
  });
});
