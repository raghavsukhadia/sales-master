"use client";

import Link from "next/link";
import type { VisitActivityItem } from "@/lib/types/visit-activity";
import {
  formatFollowUpCardLine,
  formatListLocation,
  formatVisitCardDateTime,
} from "@/lib/utils/visit-history-format";
import { VisitStatusChip } from "@/components/salesman/visit-history/visit-status-chip";
import { OrderItemsList } from "@/components/salesman/visit-history/order-items-list";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VisitActivityDrawer } from "./visit-activity-drawer";

interface VisitActivityQuickViewProps {
  visit: VisitActivityItem | null;
  open: boolean;
  onClose: () => void;
}

export function VisitActivityQuickView({ visit, open, onClose }: VisitActivityQuickViewProps) {
  const mapUrl =
    visit?.latitude != null && visit?.longitude != null
      ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`
      : null;

  return (
    <VisitActivityDrawer open={open && Boolean(visit)} onClose={onClose}>
      {visit ? (
        <div className="flex min-h-full flex-col gap-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dealer
              </p>
              <p className="text-lg font-semibold tracking-tight">{visit.dealerName}</p>
              {visit.dealerPhone ? (
                <p className="text-sm text-muted-foreground">{visit.dealerPhone}</p>
              ) : null}
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Location</dt>
                <dd className="font-medium">{formatListLocation(visit.city, visit.state)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Salesman</dt>
                <dd className="font-semibold">{visit.salespersonName?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Date</dt>
                <dd className="font-medium">{formatVisitCardDateTime(visit.visitedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Source</dt>
                <dd className="font-medium capitalize">
                  {visit.source === "web" ? "Web" : "WhatsApp"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-1.5">
              <VisitStatusChip
                label={visit.orderPlaced ? "Order placed" : "No order"}
                variant={visit.orderPlaced ? "order" : "no-order"}
              />
              <VisitStatusChip
                label={visit.dealerType === "new" ? "New dealer" : "Existing dealer"}
                variant={visit.dealerType === "new" ? "dealer-new" : "dealer-existing"}
              />
            </div>
          </div>

          <section className="border-t border-border/60 pt-4">
            <h3 className="mb-2 text-sm font-semibold">
              {visit.orderPlaced ? "Products / order" : "Products"}
            </h3>
            <OrderItemsList
              items={visit.items}
              productCount={visit.productCount}
              totalQuantity={visit.totalQuantity}
              orderValue={visit.orderValue}
            />
          </section>

          {visit.notes?.trim() ? (
            <section className="border-t border-border/60 pt-4">
              <h3 className="mb-2 text-sm font-semibold">Visit notes</h3>
              <p className="text-sm leading-relaxed text-foreground">{visit.notes}</p>
            </section>
          ) : null}

          <section className="border-t border-border/60 pt-4">
            <h3 className="mb-2 text-sm font-semibold">Follow-up</h3>
            <p className="text-sm text-foreground">
              {formatFollowUpCardLine(visit.followUpStatus, visit.followUpDate)}
            </p>
            {visit.followUpReason?.trim() ? (
              <p className="mt-1 text-sm text-muted-foreground">{visit.followUpReason}</p>
            ) : null}
          </section>

          {mapUrl ? (
            <section className="border-t border-border/60 pt-4">
              <h3 className="mb-2 text-sm font-semibold">Visit location</h3>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                View on map
              </a>
            </section>
          ) : null}

          <div className="mt-auto border-t border-border/60 pt-4">
            <Link
              href={`/visits/${visit.id}`}
              className={cn(buttonVariants({ size: "lg" }), "w-full justify-center")}
              onClick={onClose}
            >
              View full visit
            </Link>
            <Button type="button" variant="ghost" className="mt-2 w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </VisitActivityDrawer>
  );
}
