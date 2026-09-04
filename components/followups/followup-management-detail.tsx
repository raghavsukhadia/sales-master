"use client";

import Link from "next/link";
import type { FollowupManagementItem, FollowupTimelineEvent } from "@/lib/types/followup-management";
import { formatListLocation, formatVisitDateShort } from "@/lib/utils/visit-history-format";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FollowupManagementDrawer } from "./followup-management-drawer";

interface FollowupManagementDetailDrawerProps {
  item: FollowupManagementItem | null;
  timeline: FollowupTimelineEvent[];
  open: boolean;
  onClose: () => void;
  loadingTimeline?: boolean;
}

function formatActionAt(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return `${formatVisitDateShort(iso)} · ${date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function FollowupManagementDetailDrawer({
  item,
  timeline,
  open,
  onClose,
  loadingTimeline,
}: FollowupManagementDetailDrawerProps) {
  return (
    <FollowupManagementDrawer open={open && Boolean(item)} onClose={onClose}>
      {item ? (
        <div className="flex min-h-full flex-col gap-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dealer
              </p>
              <p className="text-lg font-semibold tracking-tight">{item.dealerName}</p>
              {item.dealerPhone ? (
                <p className="text-sm text-muted-foreground">{item.dealerPhone}</p>
              ) : null}
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Location</dt>
                <dd className="font-medium">{formatListLocation(item.city, item.state)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Salesman</dt>
                <dd className="font-semibold">{item.salesmanName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Follow-up</dt>
                <dd className="font-medium">{item.description}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Due</dt>
                <dd className="font-medium">{formatVisitDateShort(item.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Priority</dt>
                <dd className="font-medium capitalize">{item.priority}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Current status</dt>
                <dd className="font-medium capitalize">
                  {item.displayStatus === "due_today" ? "Due today" : item.displayStatus.replace("_", " ")}
                </dd>
              </div>
            </dl>

            {item.needsAttention ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                Needs attention · {item.attentionReasons.join(" · ")}
              </p>
            ) : null}
          </div>

          <section className="border-t border-border/60 pt-4">
            <h3 className="mb-2 text-sm font-semibold">Latest action</h3>
            <p className="font-medium text-foreground">{item.lastAction.label}</p>
            {formatActionAt(item.lastAction.at) ? (
              <p className="text-sm text-muted-foreground">{formatActionAt(item.lastAction.at)}</p>
            ) : null}
            {item.lastAction.outcome ? (
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Outcome · </span>
                {item.lastAction.label}
              </p>
            ) : null}
            {item.lastAction.notes?.trim() ? (
              <p className="mt-2 text-sm leading-relaxed text-foreground">{item.lastAction.notes}</p>
            ) : null}
            {item.nextDescription ? (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Next action · </span>
                {item.nextDescription}
              </p>
            ) : null}
            {item.nextDueDate && item.status === "completed" ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Next follow-up · </span>
                {formatVisitDateShort(item.nextDueDate)}
              </p>
            ) : null}
          </section>

          <section className="border-t border-border/60 pt-4">
            <h3 className="mb-3 text-sm font-semibold">Follow-up activity</h3>
            {loadingTimeline ? (
              <p className="text-sm text-muted-foreground">Loading timeline…</p>
            ) : timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity events available.</p>
            ) : (
              <ol className="space-y-3">
                {timeline.map((event) => (
                  <li key={event.id} className="relative pl-4">
                    <span
                      className="absolute top-1.5 left-0 size-2 rounded-full bg-border"
                      aria-hidden
                    />
                    <p className="text-xs text-muted-foreground">{formatActionAt(event.at)}</p>
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    {event.detail ? (
                      <p className="text-sm text-muted-foreground">{event.detail}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="border-t border-border/60 pt-4">
            <h3 className="mb-2 text-sm font-semibold">Related</h3>
            <div className="flex flex-col gap-2">
              {item.createdFromVisitId ? (
                <Link
                  href={`/visits/${item.createdFromVisitId}`}
                  className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
                  onClick={onClose}
                >
                  View visit
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No linked visit.</p>
              )}
            </div>
          </section>

          <div className="mt-auto border-t border-border/60 pt-4">
            <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </FollowupManagementDrawer>
  );
}
