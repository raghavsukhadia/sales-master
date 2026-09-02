"use client";

import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DealerSearchResult } from "@/lib/business/dealers";

interface DuplicateDealerBannerProps {
  dealer: DealerSearchResult;
  variant?: "exact" | "possible";
  onUseExisting: () => void;
}

export function DuplicateDealerBanner({
  dealer,
  variant = "exact",
  onUseExisting,
}: DuplicateDealerBannerProps) {
  const location = [dealer.city, dealer.state].filter(Boolean).join(", ");
  const title =
    variant === "exact" ? "Dealer already exists" : "This may be an existing dealer";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2">
        <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-medium text-amber-900">{title}</p>
          <p className="text-sm text-amber-800">
            {dealer.business_name}
            {location ? ` · ${location}` : ""}
            {dealer.phone_number ? ` · ${dealer.phone_number}` : ""}
          </p>
        </div>
      </div>
      <Button type="button" size="sm" onClick={onUseExisting} className="self-start">
        Use this dealer
      </Button>
    </div>
  );
}

interface DuplicateDealerNoticeProps {
  exactMatch: DealerSearchResult | null;
  possibleMatches: DealerSearchResult[];
  onUseExisting: (dealer: DealerSearchResult) => void;
}

export function DuplicateDealerNotice({
  exactMatch,
  possibleMatches,
  onUseExisting,
}: DuplicateDealerNoticeProps) {
  if (exactMatch) {
    return (
      <DuplicateDealerBanner
        dealer={exactMatch}
        variant="exact"
        onUseExisting={() => onUseExisting(exactMatch)}
      />
    );
  }

  if (possibleMatches.length === 1) {
    const dealer = possibleMatches[0];
    return (
      <DuplicateDealerBanner
        dealer={dealer}
        variant="possible"
        onUseExisting={() => onUseExisting(dealer)}
      />
    );
  }

  if (possibleMatches.length > 1) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-start gap-2">
          <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-medium text-amber-900">Similar dealers found</p>
            <p className="text-sm text-amber-800">
              Select an existing dealer or continue with the details below.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {possibleMatches.map((dealer) => {
            const location = [dealer.city, dealer.state].filter(Boolean).join(", ");
            return (
              <div
                key={dealer.id}
                className="flex flex-col gap-2 rounded-lg border border-amber-200/70 bg-white px-3 py-2.5"
              >
                <div>
                  <p className="font-medium text-foreground">{dealer.business_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[dealer.phone_number, location].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  onClick={() => onUseExisting(dealer)}
                >
                  Use this dealer
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
