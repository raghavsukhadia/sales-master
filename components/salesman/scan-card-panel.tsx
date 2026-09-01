"use client";

import { useRef } from "react";
import { Camera, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientOcrPhase } from "@/lib/ocr/recognize-visiting-card-client";

interface ScanCardPanelProps {
  cardPreviews: string[];
  scanning: boolean;
  scanPhase: ClientOcrPhase | null;
  scanComplete: boolean;
  scanError: string | null;
  onPhotosSelected: (files: FileList | null) => void;
  onRetake: () => void;
}

function scanStatusLabel(scanPhase: ClientOcrPhase | null): string {
  if (scanPhase === "loading") {
    return "Preparing scanner…";
  }
  return "Reading card…";
}

function scanStatusHint(scanPhase: ClientOcrPhase | null): string | null {
  if (scanPhase === "loading") {
    return "First scan may take 20–30 seconds on this device.";
  }
  return null;
}

export function ScanCardPanel({
  cardPreviews,
  scanning,
  scanPhase,
  scanComplete,
  scanError,
  onPhotosSelected,
  onRetake,
}: ScanCardPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (scanComplete && cardPreviews.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Card scanned — review details below
        </div>
        <div className="flex gap-2">
          {cardPreviews.map((preview, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={preview}
              src={preview}
              alt={`Visiting card ${index + 1}`}
              className="max-h-28 flex-1 rounded-lg border object-contain bg-white"
            />
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRetake} className="self-start">
          <RotateCcw className="h-4 w-4" />
          Retake photo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-medium">Scan visiting card</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ll automatically extract the dealer&apos;s details.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => onPhotosSelected(e.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={scanning}
        className={cn(
          "flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6 transition-colors hover:border-primary/50 hover:bg-primary/10",
          scanning && "pointer-events-none opacity-70",
        )}
      >
        {scanning ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm font-medium text-primary">
              {scanStatusLabel(scanPhase)}
            </span>
            {scanStatusHint(scanPhase) ? (
              <span className="max-w-[240px] text-center text-xs text-muted-foreground">
                {scanStatusHint(scanPhase)}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <Camera className="h-10 w-10 text-primary" />
            <span className="text-sm font-medium">Take photo or upload image</span>
            <span className="text-xs text-muted-foreground">Tap to open camera or gallery</span>
          </>
        )}
      </button>

      {cardPreviews.length > 0 && scanning ? (
        <div className="flex gap-2">
          {cardPreviews.map((preview, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={preview}
              src={preview}
              alt={`Visiting card ${index + 1}`}
              className="max-h-28 flex-1 rounded-lg border object-contain opacity-80"
            />
          ))}
        </div>
      ) : null}

      {scanError ? (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {scanError}
          <button type="button" onClick={onRetake} className="ml-2 font-medium underline">
            Retake photo
          </button>
        </div>
      ) : null}
    </div>
  );
}
