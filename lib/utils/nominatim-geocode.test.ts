import { describe, expect, it } from "vitest";
import { parseNominatimResponse } from "./nominatim-geocode";

describe("parseNominatimResponse", () => {
  it("parses Nagpur street-level address from Nominatim response", () => {
    const details = parseNominatimResponse({
      display_name:
        "Shaniwari, Mominpura, Nagpur, Nagpur Urban Taluka, Nagpur, Maharashtra, 440002, India",
      address: {
        neighbourhood: "Shaniwari",
        suburb: "Mominpura",
        city: "Nagpur",
        county: "Nagpur Urban Taluka",
        state: "Maharashtra",
        postcode: "440002",
        country: "India",
      },
    });

    expect(details).toEqual({
      address: "Shaniwari, Mominpura",
      locality: "Shaniwari",
      city: "Nagpur",
      state: "Maharashtra",
      pincode: "440002",
      label: "Shaniwari, Mominpura, Nagpur",
    });
  });

  it("includes house number and road when available", () => {
    const details = parseNominatimResponse({
      address: {
        house_number: "16",
        road: "Main Road",
        city: "Indore",
        state: "Madhya Pradesh",
        postcode: "452001",
      },
    });

    expect(details).toEqual({
      address: "16, Main Road",
      locality: undefined,
      city: "Indore",
      state: "Madhya Pradesh",
      pincode: "452001",
      label: "16, Main Road, Indore",
    });
  });

  it("returns null when no usable address parts exist", () => {
    expect(parseNominatimResponse({ address: {} })).toBeNull();
    expect(parseNominatimResponse({})).toBeNull();
  });
});
