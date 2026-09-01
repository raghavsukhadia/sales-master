"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DealerSearchResult } from "@/lib/business/dealers";
import { DealerResultCard } from "./dealer-result-card";

interface DealerSearchPanelProps {
  query: string;
  results: DealerSearchResult[];
  searching: boolean;
  selectedDealer: DealerSearchResult | null;
  onQueryChange: (query: string) => void;
  onSelect: (dealer: DealerSearchResult) => void;
}

export function DealerSearchPanel({
  query,
  results,
  searching,
  selectedDealer,
  onQueryChange,
  onSelect,
}: DealerSearchPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-medium">Find existing dealer</h3>
        <p className="text-sm text-muted-foreground">
          Search by name, phone, city, or area.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="dealer-search" className="sr-only">
          Search dealers
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="dealer-search"
            size="lg"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Name, phone, city, or area"
            className="pl-10"
          />
        </div>
      </div>

      {searching ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : null}

      {!searching && results.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {results.map((dealer) => (
            <li key={dealer.id}>
              <DealerResultCard
                dealer={dealer}
                selected={selectedDealer?.id === dealer.id}
                onSelect={() => onSelect(dealer)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {!searching && query.trim().length >= 2 && results.length === 0 ? (
        <p className="rounded-lg bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">
          No dealer found. Try scanning a card or enter details manually.
        </p>
      ) : null}

      {selectedDealer ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium text-primary">Selected:</span>{" "}
          {selectedDealer.business_name}
        </div>
      ) : null}
    </div>
  );
}
