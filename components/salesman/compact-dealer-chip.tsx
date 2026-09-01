"use client";

import { Check } from "lucide-react";

interface CompactDealerChipProps {
  dealerName: string;
}

export function CompactDealerChip({ dealerName }: CompactDealerChipProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-white px-3 py-2.5">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <p className="truncate font-medium leading-tight">{dealerName}</p>
        <p className="text-xs text-muted-foreground">Visiting dealer</p>
      </div>
    </div>
  );
}
