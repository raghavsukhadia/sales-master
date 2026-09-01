"use client";

import type { OrderSummary } from "@/lib/business/order-lines";

interface OrderSummaryPanelProps {
  summary: OrderSummary;
}

export function OrderSummaryPanel({ summary }: OrderSummaryPanelProps) {
  if (summary.productCount === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium">Order summary</p>
      <ul className="flex flex-col gap-1.5">
        {summary.rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between text-sm">
            <span className="truncate pr-2">{row.name}</span>
            <span className="shrink-0 text-muted-foreground">× {row.quantity}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {summary.productCount} product{summary.productCount === 1 ? "" : "s"} ·{" "}
        {summary.totalUnits} total unit{summary.totalUnits === 1 ? "" : "s"}
      </p>
    </div>
  );
}
