/**
 * Resolve lat/lng to structured place details (client-side).
 * Uses BigDataCloud's free reverse-geocode-client endpoint (no API key).
 */

export interface GeocodeDetails {
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  label?: string;
}

export interface CapturedLocation {
  lat: number;
  lng: number;
  label?: string;
}

interface BigDataCloudResponse {
  locality?: string;
  city?: string;
  principalSubdivision?: string;
  postcode?: string;
}

function buildGeocodeLabel(details: GeocodeDetails): string | undefined {
  const parts = [details.locality, details.city].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

function parseGeocodeResponse(data: BigDataCloudResponse): GeocodeDetails | null {
  const locality = data.locality?.trim() || undefined;
  const city = data.city?.trim() || locality || undefined;
  const state = data.principalSubdivision?.trim() || undefined;
  const pincode = data.postcode?.trim() || undefined;

  if (!locality && !city && !state && !pincode) return null;

  const details: GeocodeDetails = { locality, city, state, pincode };
  details.label = buildGeocodeLabel(details);
  return details;
}

export async function reverseGeocodeDetails(
  lat: number,
  lng: number,
): Promise<GeocodeDetails | null> {
  try {
    const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("localityLanguage", "en");

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = (await res.json()) as BigDataCloudResponse;
    return parseGeocodeResponse(data);
  } catch {
    return null;
  }
}

export async function reverseGeocodeLabel(lat: number, lng: number): Promise<string | null> {
  const details = await reverseGeocodeDetails(lat, lng);
  if (!details) return null;

  const parts = [details.locality, details.city, details.state, details.pincode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
