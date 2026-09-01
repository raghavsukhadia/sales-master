import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  User,
} from "lucide-react";
import type { VisitHistoryDetail } from "@/lib/types/visit-history";
import {
  buildTelLink,
  buildWhatsAppLink,
  formatDealerAddressBlock,
  formatDetailLocation,
  formatFollowUpLabel,
  formatVisitDateTime,
} from "@/lib/utils/visit-history-format";
import { VisitStatusChip } from "./visit-status-chip";
import { OrderItemsList } from "./order-items-list";
import { FollowUpStatusPanel } from "./follow-up-status";
import { VisitAttachmentGallery } from "./visit-attachment-gallery";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VisitDetailsPageProps {
  visit: VisitHistoryDetail;
}

function DetailSection({
  title,
  icon,
  children,
  emphasized = false,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  emphasized?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3",
        emphasized
          ? "border-primary/20 bg-primary/5 shadow-sm"
          : "border-border/60 bg-white shadow-sm",
      )}
    >
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

export function VisitDetailsPage({ visit }: VisitDetailsPageProps) {
  const { combined } = formatVisitDateTime(visit.visitedAt);
  const telLink = buildTelLink(visit.dealerPhone);
  const waLink = buildWhatsAppLink(visit.dealerPhone, visit.dealerWhatsapp);
  const location = formatDetailLocation(visit.city, visit.state);
  const { addressLine, locationLine } = formatDealerAddressBlock(
    visit.dealerAddress,
    visit.city,
    visit.state,
  );
  const followUpLabel = formatFollowUpLabel(visit.followUpStatus, visit.followUpDate);
  const showFollowUpChip =
    visit.followUpStatus === "pending" || visit.followUpStatus === "overdue";

  return (
    <div className="flex flex-col gap-4 pb-6 md:max-w-3xl">
      <Link
        href="/visit-history"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        Visit History
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{visit.dealerName}</h1>
        {location !== "—" ? <p className="text-sm text-muted-foreground">{location}</p> : null}
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          {combined}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <VisitStatusChip
          label={visit.orderPlaced ? "Order placed" : "No order"}
          variant={visit.orderPlaced ? "order" : "no-order"}
        />
        <VisitStatusChip
          label={visit.dealerType === "new" ? "New dealer" : "Existing dealer"}
          variant={visit.dealerType === "new" ? "dealer-new" : "dealer-existing"}
        />
        {showFollowUpChip ? (
          <VisitStatusChip
            label={visit.followUpStatus === "overdue" ? "Overdue" : "Follow-up due"}
            variant={
              visit.followUpStatus === "overdue" ? "follow-up-overdue" : "follow-up-pending"
            }
          />
        ) : null}
      </div>

      {(telLink || waLink) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {telLink ? (
            <a href={telLink} className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
              <Phone className="h-4 w-4" />
              Call dealer
            </a>
          ) : null}
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          ) : null}
        </div>
      )}

      <DetailSection title="Order" icon={<Package className="h-3.5 w-3.5" />} emphasized>
        <OrderItemsList
          items={visit.items}
          productCount={visit.productCount}
          totalQuantity={visit.totalQuantity}
          orderValue={visit.orderValue}
        />
      </DetailSection>

      <DetailSection title="Dealer" icon={<Phone className="h-3.5 w-3.5" />}>
        <div className="flex flex-col gap-1.5 text-sm">
          {visit.dealerPhone ? (
            <p className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              {visit.dealerPhone}
            </p>
          ) : null}
          {addressLine ? <p className="text-muted-foreground">{addressLine}</p> : null}
          {locationLine ? <p className="text-muted-foreground">{locationLine}</p> : null}
        </div>
      </DetailSection>

      <DetailSection title="Visit" icon={<User className="h-3.5 w-3.5" />}>
        <div className="flex flex-col gap-1.5 text-sm">
          {visit.salespersonName ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" aria-hidden />
              Salesperson: {visit.salespersonName}
            </p>
          ) : null}
          {visit.locationCaptured ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Location captured ✓
            </p>
          ) : null}
        </div>
      </DetailSection>

      <DetailSection title="Follow-up" icon={<Clock className="h-3.5 w-3.5" />}>
        <FollowUpStatusPanel
          followUpDate={visit.followUpDate}
          followUpReason={visit.followUpReason}
          followUpStatus={visit.followUpStatus}
          followUpLabel={followUpLabel}
        />
      </DetailSection>

      {visit.notes?.trim() ? (
        <DetailSection title="Notes">
          <p className="text-sm text-foreground">{visit.notes}</p>
        </DetailSection>
      ) : null}

      {visit.attachments.length > 0 ? (
        <DetailSection title="Visiting card">
          <VisitAttachmentGallery attachments={visit.attachments} />
        </DetailSection>
      ) : null}

      {visit.previousVisits.length > 0 ? (
        <DetailSection title="Previous visits">
          <ul className="flex flex-col gap-2">
            {visit.previousVisits.map((previous) => (
              <li key={previous.id}>
                <Link href={`/visit-history/${previous.id}`} className="text-sm text-primary hover:underline">
                  {new Date(previous.visitedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Link>
              </li>
            ))}
          </ul>
        </DetailSection>
      ) : null}
    </div>
  );
}
