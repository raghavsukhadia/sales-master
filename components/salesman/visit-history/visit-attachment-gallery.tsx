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

  if (!expanded) {
    return (
      <Button type="button" variant="outline" className="w-full justify-center" onClick={() => setExpanded(true)}>
        {label}
      </Button>
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
            className="max-h-72 w-full rounded-lg border border-border/60 object-contain bg-muted/30"
            loading="lazy"
          />
        </figure>
      ))}
      <Button type="button" variant="ghost" size="sm" className="self-start px-0" onClick={() => setExpanded(false)}>
        Hide card
      </Button>
    </div>
  );
}
