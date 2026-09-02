"use client";

import { useRef } from "react";
import { Camera, CheckCircle2, ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScanCardPanelProps {
  cardPreviews: string[];
  scanning: boolean;
  scanComplete: boolean;
  scanError: string | null;
  onPhotosSelected: (files: FileList | null) => void;
  onRetake: () => void;
}

function CardCaptureInputs({
  cameraInputRef,
  galleryInputRef,
  onPhotosSelected,
}: {
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotosSelected: (files: FileList | null) => void;
}) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    onPhotosSelected(e.target.files);
    e.target.value = "";
  }

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}

function CardCaptureActions({
  disabled,
  cameraInputRef,
  galleryInputRef,
  className,
}: {
  disabled?: boolean;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-3 py-4 transition-colors hover:border-primary/50 hover:bg-primary/10",
          disabled && "pointer-events-none opacity-70",
        )}
      >
        <Camera className="h-8 w-8 text-primary" />
        <span className="text-sm font-medium">Take photo</span>
      </button>
      <button
        type="button"
        onClick={() => galleryInputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-3 py-4 transition-colors hover:border-primary/50 hover:bg-primary/10",
          disabled && "pointer-events-none opacity-70",
        )}
      >
        <ImageUp className="h-8 w-8 text-primary" />
        <span className="text-sm font-medium">Upload image</span>
      </button>
    </div>
  );
}

export function ScanCardPanel({
  cardPreviews,
  scanning,
  scanComplete,
  scanError,
  onPhotosSelected,
  onRetake,
}: ScanCardPanelProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  if (scanComplete && cardPreviews.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <CardCaptureInputs
          cameraInputRef={cameraInputRef}
          galleryInputRef={galleryInputRef}
          onPhotosSelected={onPhotosSelected}
        />
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
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Scan a different card?</p>
          <CardCaptureActions
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
          />
          <Button type="button" variant="ghost" size="sm" onClick={onRetake} className="self-start">
            Clear and start over
          </Button>
        </div>
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

      <CardCaptureInputs
        cameraInputRef={cameraInputRef}
        galleryInputRef={galleryInputRef}
        onPhotosSelected={onPhotosSelected}
      />

      {scanning ? (
        <div
          className={cn(
            "flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-4 py-6",
          )}
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="text-sm font-medium text-primary">Extracting details…</span>
        </div>
      ) : (
        <CardCaptureActions
          disabled={scanning}
          cameraInputRef={cameraInputRef}
          galleryInputRef={galleryInputRef}
        />
      )}

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
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="font-medium underline"
            >
              Take photo
            </button>
            <span className="text-destructive/60">·</span>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="font-medium underline"
            >
              Upload image
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
