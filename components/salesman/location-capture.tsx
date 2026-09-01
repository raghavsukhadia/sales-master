"use client";

import { MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  reverseGeocodeDetails,
  type CapturedLocation,
  type GeocodeDetails,
} from "@/lib/utils/reverse-geocode";
import { useState } from "react";

interface LocationCaptureProps {
  location: CapturedLocation | null;
  onLocationChange: (location: CapturedLocation | null) => void;
  onGeocodeApplied?: (details: GeocodeDetails) => void;
}

export function LocationCapture({
  location,
  onLocationChange,
  onGeocodeApplied,
}: LocationCaptureProps) {
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function capture() {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        onLocationChange({ lat, lng });
        setLocating(false);
        setGeocoding(true);
        const details = await reverseGeocodeDetails(lat, lng);
        if (details) {
          onGeocodeApplied?.(details);
        }
        onLocationChange({
          lat,
          lng,
          label: details?.label ?? undefined,
        });
        setGeocoding(false);
      },
      (err) => {
        setError(err.message || "Couldn't get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  if (location) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-sm font-medium text-emerald-900">
            {locating ? "Getting location…" : geocoding ? "Looking up address…" : "Location captured"}
          </p>
          {location.label ? (
            <p className="text-xs text-emerald-800">{location.label}</p>
          ) : (
            <p className="text-xs text-emerald-700">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 text-emerald-800"
          onClick={capture}
          disabled={locating || geocoding}
        >
          Update
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={capture}
        disabled={locating || geocoding}
        className="justify-start gap-2"
      >
        {locating || geocoding ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4 text-primary" />
        )}
        {locating ? "Getting location…" : geocoding ? "Looking up address…" : "Use current location"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
