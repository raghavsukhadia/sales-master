"use client";

import type { FollowupDisplayStatus, FollowupManagementItem } from "@/lib/types/followup-management";
import { formatListLocation, formatVisitDateShort } from "@/lib/utils/visit-history-format";
import { cn } from "@/lib/utils";

interface FollowupManagementTableProps {
  items: FollowupManagementItem[];
  onView: (item: FollowupManagementItem) => void;
}

function statusLabel(status: FollowupDisplayStatus): string {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "due_today":
      return "Due today";
    case "upcoming":
      return "Upcoming";
    case "completed":
      return "Completed";
  }
}

function statusClass(status: FollowupDisplayStatus): string {
  switch (status) {
    case "overdue":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";
    case "due_today":
      return "bg-amber-50 text-amber-900 ring-1 ring-amber-200";
    case "upcoming":
      return "bg-muted text-muted-foreground";
    case "completed":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
  }
}

function dueLabel(item: FollowupManagementItem): string {
  if (item.displayStatus === "due_today") return "Today";
  if (item.displayStatus === "overdue") return formatVisitDateShort(item.dueDate);
  if (item.displayStatus === "completed") {
    return item.completedAt ? formatVisitDateShort(item.completedAt) : formatVisitDateShort(item.dueDate);
  }
  return formatVisitDateShort(item.dueDate);
}

function lastActionTime(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const datePart = formatVisitDateShort(iso);
  const timePart = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function FollowupManagementTable({ items, onView }: FollowupManagementTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-white">
      <table className="w-full min-w-[1100px] text-sm">
        <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 font-medium">Due</th>
            <th className="px-3 py-2.5 font-medium">Salesman</th>
            <th className="px-3 py-2.5 font-medium">Dealer</th>
            <th className="px-3 py-2.5 font-medium">Follow-up</th>
            <th className="px-3 py-2.5 font-medium">Priority</th>
            <th className="px-3 py-2.5 font-medium">Last Action</th>
            <th className="px-3 py-2.5 font-medium">Outcome</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const actionTime = lastActionTime(item.lastAction.at);
            return (
              <tr
                key={item.id}
                className="cursor-pointer border-b last:border-b-0 hover:bg-muted/20"
                onClick={() => onView(item)}
              >
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span
                    className={
                      item.displayStatus === "overdue"
                        ? "font-medium text-red-700"
                        : "text-foreground"
                    }
                  >
                    {dueLabel(item)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-semibold text-foreground">{item.salesmanName}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{item.dealerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatListLocation(item.city, item.state)}
                    </p>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <p className="max-w-[180px] truncate font-medium">{item.description}</p>
                  {item.needsAttention ? (
                    <p className="mt-0.5 text-[11px] font-medium text-amber-800">Needs attention</p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 capitalize text-muted-foreground">{item.priority}</td>
                <td className="px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{item.lastAction.label}</p>
                    {actionTime ? (
                      <p className="text-xs text-muted-foreground">{actionTime}</p>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {item.lastAction.outcome ? item.lastAction.label : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      statusClass(item.displayStatus),
                    )}
                  >
                    {statusLabel(item.displayStatus)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={(event) => {
                      event.stopPropagation();
                      onView(item);
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
