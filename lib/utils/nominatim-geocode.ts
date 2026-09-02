import type { GeocodeDetails } from "@/lib/utils/reverse-geocode";

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  highway?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface NominatimReverseResponse {
  display_name?: string;
  address?: NominatimAddress;
}

function trimOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function buildStreetAddress(address: NominatimAddress): string | undefined {
  const road = address.road || address.pedestrian || address.highway;
  const parts = [
    address.house_number,
    road,
    address.neighbourhood,
    address.suburb,
    address.quarter,
  ]
    .map((part) => trimOrUndefined(part))
    .filter(Boolean);

  if (parts.length > 0) return parts.join(", ");

  return undefined;
}

function resolveCity(address: NominatimAddress): string | undefined {
  return trimOrUndefined(
    address.city || address.town || address.village || address.county,
  );
}

function buildGeocodeLabel(details: GeocodeDetails): string | undefined {
  const parts = [details.address, details.city].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

export function parseNominatimResponse(data: NominatimReverseResponse): GeocodeDetails | null {
  const address = data.address;
  if (!address) return null;

  const streetAddress = buildStreetAddress(address);
  const city = resolveCity(address);
  const state = trimOrUndefined(address.state);
  const pincode = trimOrUndefined(address.postcode);
  const locality =
    trimOrUndefined(address.neighbourhood) ||
    trimOrUndefined(address.suburb) ||
    trimOrUndefined(address.quarter);

  if (!streetAddress && !locality && !city && !state && !pincode) return null;

  const details: GeocodeDetails = {
    address: streetAddress,
    locality,
    city,
    state,
    pincode,
  };
  details.label = buildGeocodeLabel(details);
  return details;
}
