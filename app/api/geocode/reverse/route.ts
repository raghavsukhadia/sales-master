import { NextRequest, NextResponse } from "next/server";
import {
  parseNominatimResponse,
  type NominatimReverseResponse,
} from "@/lib/utils/nominatim-geocode";

const NOMINATIM_USER_AGENT = "SalesMaster/1.0";

function parseCoordinate(value: string | null, min: number, max: number): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
}

export async function GET(request: NextRequest) {
  const lat = parseCoordinate(request.nextUrl.searchParams.get("lat"), -90, 90);
  const lng = parseCoordinate(request.nextUrl.searchParams.get("lng"), -180, 180);

  if (lat === null || lng === null) {
    return NextResponse.json({ error: "Invalid latitude or longitude" }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Reverse geocode failed" }, { status: res.status });
    }

    const data = (await res.json()) as NominatimReverseResponse;
    const details = parseNominatimResponse(data);

    if (!details) {
      return NextResponse.json({ error: "No address found for coordinates" }, { status: 404 });
    }

    return NextResponse.json(details);
  } catch {
    return NextResponse.json({ error: "Reverse geocode failed" }, { status: 500 });
  }
}
