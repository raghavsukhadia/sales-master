"use client";

import { useState } from "react";
import type { VisitAttachment } from "@/lib/types/visit-history";
import { Button } from "@/components/ui/button";

interface VisitAttachmentGalleryProps {
  attachments: VisitAttachment[];
}

export function VisitAttachmentGallery({ attachments }: VisitAttachmentGalleryProps) {
  const [expanded, setExpanded] = useState(false);
  const label =
    attachments.length === 1
      ? "View scanned card"
      : `View scanned cards (${attachments.length})`;
  const preview = attachments[0];

  if (!expanded) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {preview ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="size-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          </button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center sm:w-auto"
          onClick={() => setExpanded(true)}
        >
          {label}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {attachments.map((attachment) => (
        <figure key={attachment.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt="Visiting card"
            className="max-h-72 w-full rounded-lg border border-border/60 bg-muted/30 object-contain"
            loading="lazy"
          />
        </figure>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start px-0"
        onClick={() => setExpanded(false)}
      >
        Hide card
      </Button>
    </div>
  );
}
