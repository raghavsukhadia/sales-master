"use client";

import type { VisitActivityItem } from "@/lib/types/visit-activity";
import {
  formatListLocation,
  formatVisitCardDateTime,
  formatVisitDateShort,
} from "@/lib/utils/visit-history-format";
import { VisitStatusChip } from "@/components/salesman/visit-history/visit-status-chip";

interface VisitActivityTableProps {
  visits: VisitActivityItem[];
  onView: (visit: VisitActivityItem) => void;
}

function ProductsCell({ visit }: { visit: VisitActivityItem }) {
  if (!visit.orderPlaced || visit.items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const first = visit.items[0]?.productName ?? "—";
  const extra = visit.items.length - 1;

  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">{first}</p>
      {extra > 0 ? (
        <p className="text-xs text-muted-foreground">+{extra} more</p>
      ) : null}
    </div>
  );
}

function FollowUpCell({ visit }: { visit: VisitActivityItem }) {
  if (visit.followUpStatus === "none" || visit.followUpStatus === "completed" || !visit.followUpDate) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span
      className={
        visit.followUpStatus === "overdue" ? "font-medium text-red-700" : "text-foreground"
      }
    >
      {formatVisitDateShort(visit.followUpDate)}
    </span>
  );
}

export function VisitActivityTable({ visits, onView }: VisitActivityTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-white">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Date &amp; Time</th>
            <th className="px-3 py-2.5 font-medium">Salesman</th>
            <th className="px-3 py-2.5 font-medium">Dealer</th>
            <th className="px-3 py-2.5 font-medium">Location</th>
            <th className="px-3 py-2.5 font-medium">Products</th>
            <th className="px-3 py-2.5 font-medium">Result</th>
            <th className="px-3 py-2.5 font-medium">Follow-up</th>
            <th className="px-3 py-2.5 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => {
            const dateTime = formatVisitCardDateTime(visit.visitedAt);
            const [datePart, timePart] = dateTime.split(" · ");

            return (
              <tr
                key={visit.id}
                className="cursor-pointer border-b last:border-b-0 hover:bg-muted/20"
                onClick={() => onView(visit)}
              >
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                  <div className="flex flex-col">
                    <span className="text-foreground">{datePart}</span>
                    <span className="text-xs">{timePart}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-semibold text-foreground">
                    {visit.salespersonName?.trim() || "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{visit.dealerName}</p>
                    {visit.dealerPhone ? (
                      <p className="text-xs text-muted-foreground">{visit.dealerPhone}</p>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {formatListLocation(visit.city, visit.state)}
                </td>
                <td className="px-3 py-2.5">
                  <ProductsCell visit={visit} />
                </td>
                <td className="px-3 py-2.5">
                  <VisitStatusChip
                    label={visit.orderPlaced ? "Order placed" : "No order"}
                    variant={visit.orderPlaced ? "order" : "no-order"}
                  />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <FollowUpCell visit={visit} />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={(event) => {
                      event.stopPropagation();
                      onView(visit);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
