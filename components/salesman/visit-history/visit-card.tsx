"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { VisitHistoryItem } from "@/lib/types/visit-history";
import {
  formatFollowUpLabel,
  formatListLocation,
  formatVisitDateTime,
} from "@/lib/utils/visit-history-format";
import { VisitStatusChip } from "./visit-status-chip";

interface VisitCardProps {
  visit: VisitHistoryItem;
}

export function VisitCard({ visit }: VisitCardProps) {
  const { combined } = formatVisitDateTime(visit.visitedAt);
  const location = formatListLocation(visit.city, visit.state);
  const followUpLabel = formatFollowUpLabel(visit.followUpStatus, visit.followUpDate);
  const showFollowUpProminent =
    visit.followUpStatus === "pending" || visit.followUpStatus === "overdue";
  const primaryItem = visit.items[0];

  return (
    <Link
      href={`/visit-history/${visit.id}`}
      className="group block rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-base font-semibold">{visit.dealerName}</p>
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
          </div>

          {location !== "—" ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{location}</p>
          ) : null}

          <p className="mt-1 text-xs text-muted-foreground">{combined}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <VisitStatusChip
              label={visit.orderPlaced ? "Order placed" : "No order"}
              variant={visit.orderPlaced ? "order" : "no-order"}
            />
            {showFollowUpProminent ? (
              <VisitStatusChip
                label={visit.followUpStatus === "overdue" ? "Overdue" : "Follow-up due"}
                variant={
                  visit.followUpStatus === "overdue" ? "follow-up-overdue" : "follow-up-pending"
                }
              />
            ) : null}
          </div>

          {showFollowUpProminent ? (
            <p
              className={
                visit.followUpStatus === "overdue"
                  ? "mt-2 text-sm font-medium text-red-700"
                  : "mt-2 text-sm font-medium text-amber-800"
              }
            >
              {followUpLabel}
            </p>
          ) : null}

          {visit.orderPlaced && primaryItem ? (
            <div className="mt-2 text-sm">
              <p className="font-medium">{primaryItem.productName}</p>
              <p className="text-muted-foreground">
                {primaryItem.quantity} {primaryItem.unit ?? "pcs"}
              </p>
            </div>
          ) : null}

          {visit.salespersonName ? (
            <p className="mt-2 text-xs text-muted-foreground">Visited by {visit.salespersonName}</p>
          ) : null}

          <p className="mt-2 text-xs font-medium text-primary">View details →</p>
        </div>
      </div>
    </Link>
  );
}
