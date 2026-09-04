import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import type { VisitFollowUpStatus, VisitHistoryDetail } from "@/lib/types/visit-history";
import {
  buildTelLink,
  buildWhatsAppLink,
  formatDealerAddressBlock,
  formatFollowUpLabel,
  formatVisitDateTime,
} from "@/lib/utils/visit-history-format";
import { VisitStatusChip } from "./visit-status-chip";
import { OrderItemsList } from "./order-items-list";
import { FollowUpStatusPanel } from "./follow-up-status";
import { VisitSecondaryActions } from "./visit-secondary-actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VisitDetailsPageProps {
  visit: VisitHistoryDetail;
  /** Defaults to salesman Visit History. Admin passes `/visits`. */
  backHref?: string;
  backLabel?: string;
  /** When true, show WhatsApp / Web source under visit meta. */
  showSource?: boolean;
  /** Base path for previous-visit timeline links. */
  visitDetailBasePath?: string;
}

function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-border/60 pt-6", className)}>
      <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** Concise header chip label; null when no chip should show. */
function followUpChipLabel(
  status: VisitFollowUpStatus,
  dueDate?: string | null,
): string | null {
  if (status === "overdue") return "Overdue";
  if (status !== "pending") return null;
  const label = formatFollowUpLabel(status, dueDate);
  if (label.startsWith("Follow-up ")) {
    return label.replace(/^Follow-up /, "Due ");
  }
  return label === "No follow-up" ? null : label;
}

export function VisitDetailsPage({
  visit,
  backHref = "/visit-history",
  backLabel = "Visit History",
  showSource = false,
  visitDetailBasePath = "/visit-history",
}: VisitDetailsPageProps) {
  const { dateLabel, timeLabel } = formatVisitDateTime(visit.visitedAt);
  const telLink = buildTelLink(visit.dealerPhone);
  const waLink = buildWhatsAppLink(visit.dealerPhone, visit.dealerWhatsapp);
  const { addressLine, locationLine } = formatDealerAddressBlock(
    visit.dealerAddress,
    visit.city,
    visit.state,
  );
  const followUpLabel = formatFollowUpLabel(visit.followUpStatus, visit.followUpDate);
  const headerFollowUpChip = followUpChipLabel(visit.followUpStatus, visit.followUpDate);

  const sourceLabel =
    visit.source === "web" ? "Web" : visit.source === "whatsapp" ? "WhatsApp" : null;

  const metaParts = [
    dateLabel,
    timeLabel,
    visit.salespersonName?.trim() || null,
    visit.locationCaptured ? "Location captured" : null,
    showSource && sourceLabel ? `Source: ${sourceLabel}` : null,
  ].filter(Boolean);

  const mapUrl =
    visit.latitude != null && visit.longitude != null
      ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`
      : null;

  return (
    <div className="flex w-full max-w-5xl flex-col space-y-6 pb-6">
      <div className="flex flex-col gap-5">
        <Link
          href={backHref}
          className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>

        <header className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <div className="min-w-0 flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl md:text-3xl">
                {visit.dealerName}
              </h1>
              {visit.dealerPhone ? (
                telLink ? (
                  <a
                    href={telLink}
                    className="text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {visit.dealerPhone}
                  </a>
                ) : (
                  <p className="text-sm font-medium text-foreground">{visit.dealerPhone}</p>
                )
              ) : null}
              {addressLine ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{addressLine}</p>
              ) : null}
              {locationLine ? (
                <p className="text-sm text-muted-foreground">{locationLine}</p>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                <VisitStatusChip
                  label={visit.orderPlaced ? "Order placed" : "No order"}
                  variant={visit.orderPlaced ? "order" : "no-order"}
                />
                <VisitStatusChip
                  label={visit.dealerType === "new" ? "New dealer" : "Existing dealer"}
                  variant={visit.dealerType === "new" ? "dealer-new" : "dealer-existing"}
                />
                {headerFollowUpChip ? (
                  <VisitStatusChip
                    label={headerFollowUpChip}
                    variant={
                      visit.followUpStatus === "overdue"
                        ? "follow-up-overdue"
                        : "follow-up-pending"
                    }
                  />
                ) : null}
              </div>
              <VisitSecondaryActions
                variant="sidebar"
                attachments={visit.attachments}
                previousVisits={visit.previousVisits}
                visitDetailBasePath={visitDetailBasePath}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{metaParts.join(" • ")}</p>

          {(telLink || waLink) && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {telLink ? (
                <a
                  href={telLink}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "w-full justify-center gap-2 sm:w-auto",
                  )}
                >
                  <Phone className="h-4 w-4" aria-hidden />
                  Call dealer
                </a>
              ) : null}
              {waLink ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full justify-center gap-2 sm:w-auto",
                  )}
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  WhatsApp
                </a>
              ) : null}
            </div>
          )}
        </header>
      </div>

      <DetailSection title={visit.orderPlaced ? "Today's order" : "Today's visit"}>
        <div className="flex flex-col gap-3">
          <OrderItemsList
            items={visit.items}
            productCount={visit.productCount}
            totalQuantity={visit.totalQuantity}
            orderValue={visit.orderValue}
          />
          {visit.notes?.trim() ? (
            <div className="border-t border-border/40 pt-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
              <p className="text-sm leading-relaxed text-foreground">{visit.notes}</p>
            </div>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="Next action">
        <FollowUpStatusPanel
          followUpDate={visit.followUpDate}
          followUpReason={visit.followUpReason}
          followUpStatus={visit.followUpStatus}
          followUpLabel={followUpLabel}
        />
      </DetailSection>

      {mapUrl ? (
        <DetailSection title="Visit location">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View on map
          </a>
        </DetailSection>
      ) : null}
    </div>
  );
}
