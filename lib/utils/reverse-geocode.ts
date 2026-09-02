/**
 * Resolve lat/lng to structured place details.
 * Primary: Nominatim via /api/geocode/reverse (street-level in India).
 * Fallback: BigDataCloud free client endpoint.
 */

export interface GeocodeDetails {
  address?: string;
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

function buildBigDataCloudLabel(details: GeocodeDetails): string | undefined {
  const parts = [details.address, details.city].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

function parseBigDataCloudResponse(data: BigDataCloudResponse): GeocodeDetails | null {
  const locality = data.locality?.trim() || undefined;
  const city = data.city?.trim() || locality || undefined;
  const state = data.principalSubdivision?.trim() || undefined;
  const pincode = data.postcode?.trim() || undefined;

  if (!locality && !city && !state && !pincode) return null;

  const details: GeocodeDetails = {
    address: locality,
    locality,
    city,
    state,
    pincode,
  };
  details.label = buildBigDataCloudLabel(details);
  return details;
}

async function reverseGeocodeFromApi(lat: number, lng: number): Promise<GeocodeDetails | null> {
  try {
    const url = new URL("/api/geocode/reverse", window.location.origin);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    return (await res.json()) as GeocodeDetails;
  } catch {
    return null;
  }
}

async function reverseGeocodeFromBigDataCloud(
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
    return parseBigDataCloudResponse(data);
  } catch {
    return null;
  }
}

export async function reverseGeocodeDetails(
  lat: number,
  lng: number,
): Promise<GeocodeDetails | null> {
  const nominatim = await reverseGeocodeFromApi(lat, lng);
  if (nominatim) return nominatim;

  return reverseGeocodeFromBigDataCloud(lat, lng);
}

export async function reverseGeocodeLabel(lat: number, lng: number): Promise<string | null> {
  const details = await reverseGeocodeDetails(lat, lng);
  if (!details) return null;

  const parts = [
    details.address,
    details.locality,
    details.city,
    details.state,
    details.pincode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
