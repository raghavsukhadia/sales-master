"use client";

import { cn } from "@/lib/utils";
import type { OrderPlacement } from "@/lib/business/order-lines";

interface OrderPlacementToggleProps {
  value: OrderPlacement;
  onChange: (value: OrderPlacement) => void;
}

export function OrderPlacementToggle({ value, onChange }: OrderPlacementToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Did they place an order?</p>
      <div className="flex rounded-xl border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => onChange("yes")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            value === "yes"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange("no")}
          className={cn(
            "flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            value === "no"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          No order
        </button>
      </div>
    </div>
  );
}
