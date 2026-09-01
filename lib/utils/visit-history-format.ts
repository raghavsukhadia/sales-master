export function formatVisitDateTime(iso: string): { dateLabel: string; timeLabel: string; combined: string } {
  const date = new Date(iso);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startVisit = new Date(date);
  startVisit.setHours(0, 0, 0, 0);

  const diffDays = Math.round((startToday.getTime() - startVisit.getTime()) / (1000 * 60 * 60 * 24));

  let dateLabel: string;
  if (diffDays === 0) dateLabel = "Today";
  else if (diffDays === 1) dateLabel = "Yesterday";
  else dateLabel = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const timeLabel = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  return {
    dateLabel,
    timeLabel,
    combined: `${dateLabel} • ${timeLabel}`,
  };
}

export function formatVisitDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatLocation(city?: string | null, state?: string | null, area?: string | null): string {
  const parts = [area, city, state].filter(Boolean);
  return parts.join(", ") || "—";
}

export function formatListLocation(city?: string | null, state?: string | null): string {
  const parts = [city, state].filter(Boolean);
  return parts.join(", ") || "—";
}

export function formatDetailLocation(city?: string | null, state?: string | null): string {
  return formatListLocation(city, state);
}

export function formatDealerAddressBlock(
  address?: string | null,
  city?: string | null,
  state?: string | null,
): { addressLine: string | null; locationLine: string | null } {
  const addressLine = address?.trim() || null;
  const locationLine = formatListLocation(city, state);
  const locationNormalized = locationLine === "—" ? null : locationLine.toLowerCase();
  const addressNormalized = addressLine?.toLowerCase() ?? "";

  if (!addressLine) {
    return { addressLine: null, locationLine: locationNormalized ? locationLine : null };
  }

  if (locationNormalized && addressNormalized.includes(locationNormalized)) {
    return { addressLine, locationLine: null };
  }

  return {
    addressLine,
    locationLine: locationNormalized ? locationLine : null,
  };
}

export function formatOrderSummaryLine(
  items: { productName: string; quantity: number; unit?: string }[],
): string | null {
  if (items.length === 0) return null;
  const first = items[0];
  const unit = first.unit ?? "pcs";
  const primary = `${first.productName} · ${first.quantity} ${unit}`;
  if (items.length === 1) return primary;
  return `${primary} +${items.length - 1} more`;
}

export function formatFollowUpLabel(
  status: "none" | "pending" | "completed" | "overdue",
  dueDate?: string | null,
  now: Date = new Date(),
): string {
  if (status === "none" || !dueDate) return "No follow-up";
  if (status === "completed") return "Follow-up completed";

  const due = new Date(dueDate);
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startDue = new Date(due);
  startDue.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startDue.getTime() - startToday.getTime()) / (1000 * 60 * 60 * 24));

  if (status === "overdue") {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays === 0) return "Overdue today";
    if (overdueDays === 1) return "Overdue by 1 day";
    return `Overdue by ${overdueDays} days`;
  }

  if (diffDays === 0) return "Follow-up today";
  if (diffDays === 1) return "Follow-up tomorrow";
  if (diffDays > 1) return `Follow-up in ${diffDays} days`;
  return "Follow-up due";
}

export function getVisitDateGroupLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startVisit = new Date(date);
  startVisit.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startToday.getTime() - startVisit.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-IN", { weekday: "long" });
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: sameYear ? undefined : "numeric",
  });
}

export function groupVisitsByDateLabel<T extends { visitedAt: string }>(
  items: T[],
  now: Date = new Date(),
): { label: string; items: T[] }[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const label = getVisitDateGroupLabel(item.visitedAt, now);
    const bucket = groups.get(label);
    if (bucket) bucket.push(item);
    else groups.set(label, [item]);
  }

  return [...groups.entries()].map(([label, groupItems]) => ({ label, items: groupItems }));
}

export function buildTelLink(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:${digits}` : null;
}

export function buildWhatsAppLink(phone?: string | null, whatsapp?: string | null): string | null {
  const raw = whatsapp || phone;
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return digits ? `https://wa.me/${digits}` : null;
}
