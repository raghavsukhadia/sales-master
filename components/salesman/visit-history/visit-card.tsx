"use client";

import Link from "next/link";
import type { VisitHistoryItem } from "@/lib/types/visit-history";
import {
  formatFollowUpCardLine,
  formatListLocation,
  formatVisitCardDateTime,
} from "@/lib/utils/visit-history-format";
import { cn } from "@/lib/utils";
import { VisitStatusChip } from "./visit-status-chip";

interface VisitCardProps {
  visit: VisitHistoryItem;
}

export function VisitCard({ visit }: VisitCardProps) {
  const location = formatListLocation(visit.city, visit.state);
  const visitDateTime = formatVisitCardDateTime(visit.visitedAt);
  const followUpLine = formatFollowUpCardLine(visit.followUpStatus, visit.followUpDate);
  const isOverdue = visit.followUpStatus === "overdue";

  return (
    <Link
      href={`/visit-history/${visit.id}`}
      className="group block rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-0.5">
        <div className="min-w-0">
          <p className="truncate font-semibold">{visit.dealerName}</p>
          {location !== "—" ? (
            <p className="truncate text-sm text-muted-foreground">{location}</p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground sm:text-sm">{visitDateTime}</p>
          <div className="mt-1 flex justify-end">
            <VisitStatusChip
              label={visit.orderPlaced ? "Order placed" : "No order"}
              variant={visit.orderPlaced ? "order" : "no-order"}
            />
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-[1fr_auto] items-center gap-x-3">
        <p
          className={cn(
            "min-w-0 truncate text-sm",
            isOverdue
              ? "rounded-md bg-red-50/60 px-2 py-0.5 text-red-700"
              : "text-muted-foreground",
          )}
        >
          {followUpLine}
        </p>
        <span className="shrink-0 whitespace-nowrap text-right text-sm text-muted-foreground group-hover:text-foreground">
          View details →
        </span>
      </div>
    </Link>
  );
}
