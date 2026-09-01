import Link from "next/link";
import type { VisitHistoryItem } from "@/lib/types/visit-history";
import {
  formatCurrency,
  formatLocation,
  formatVisitDateTime,
} from "@/lib/utils/visit-history-format";

interface VisitHistoryTableProps {
  visits: VisitHistoryItem[];
}

export function VisitHistoryTable({ visits }: VisitHistoryTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border/60 bg-white md:block">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Dealer</th>
            <th className="px-4 py-3 font-medium">Visit Date</th>
            <th className="px-4 py-3 font-medium">City</th>
            <th className="px-4 py-3 font-medium">Order</th>
            <th className="px-4 py-3 font-medium">Value</th>
            <th className="px-4 py-3 font-medium">Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => {
            const { combined } = formatVisitDateTime(visit.visitedAt);
            return (
              <tr key={visit.id} className="border-b last:border-b-0 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/visit-history/${visit.id}`} className="font-medium hover:text-primary">
                    {visit.dealerName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{combined}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatLocation(visit.city, visit.state, visit.area)}
                </td>
                <td className="px-4 py-3">
                  {visit.orderPlaced
                    ? `${visit.productCount} item${visit.productCount === 1 ? "" : "s"}`
                    : "No order"}
                </td>
                <td className="px-4 py-3">
                  {visit.orderValue ? formatCurrency(visit.orderValue) : "—"}
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">
                  {visit.followUpStatus === "none" ? "—" : visit.followUpStatus}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
