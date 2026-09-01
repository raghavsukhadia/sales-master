import { cn } from "@/lib/utils";

type ChipVariant =
  | "order"
  | "no-order"
  | "follow-up-pending"
  | "follow-up-overdue"
  | "follow-up-completed"
  | "dealer-new"
  | "dealer-existing";

const VARIANTS: Record<ChipVariant, string> = {
  order: "bg-primary/10 text-primary ring-1 ring-primary/15",
  "no-order": "bg-muted text-muted-foreground",
  "follow-up-pending": "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  "follow-up-overdue": "bg-red-50 text-red-700 ring-1 ring-red-200",
  "follow-up-completed": "bg-emerald-50 text-emerald-700",
  "dealer-new": "bg-primary/10 text-primary ring-1 ring-primary/15",
  "dealer-existing": "bg-muted text-muted-foreground",
};

interface VisitStatusChipProps {
  label: string;
  variant: ChipVariant;
}

export function VisitStatusChip({ label, variant }: VisitStatusChipProps) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold", VARIANTS[variant])}>
      {label}
    </span>
  );
}
