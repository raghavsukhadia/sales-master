"use client";

import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DealerSearchResult } from "@/lib/business/dealers";

interface DuplicateDealerBannerProps {
  dealer: DealerSearchResult;
  onUseExisting: () => void;
  onDismiss?: () => void;
}

export function DuplicateDealerBanner({
  dealer,
  onUseExisting,
}: DuplicateDealerBannerProps) {
  const location = [dealer.city, dealer.state].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-medium text-amber-900">Dealer already exists</p>
          <p className="text-sm text-amber-800">
            {dealer.business_name}
            {location ? ` · ${location}` : ""}
          </p>
        </div>
      </div>
      <Button type="button" size="sm" onClick={onUseExisting} className="self-start">
        Use this dealer
      </Button>
    </div>
  );
}
