"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VisitSuccessScreenProps {
  dealerName: string;
  visitNumber: string;
  hasOrder: boolean;
  itemCount: number;
  recordedAt: Date;
  nextActionLabel?: string | null;
  onRecordAnother: () => void;
}

export function VisitSuccessScreen({
  dealerName,
  visitNumber,
  hasOrder,
  itemCount,
  recordedAt,
  nextActionLabel,
  onRecordAnother,
}: VisitSuccessScreenProps) {
  const timeLabel = recordedAt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  const orderLabel =
    hasOrder && itemCount > 0
      ? ` · ${itemCount} order item${itemCount === 1 ? "" : "s"} (lines 1–${itemCount})`
      : "";

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 className="h-9 w-9 text-emerald-600" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Visit recorded</h2>
        <p className="text-lg font-semibold text-primary">{visitNumber}</p>
        <p className="text-lg font-medium text-foreground">{dealerName}</p>
        <p className="text-sm text-muted-foreground">
          Today at {timeLabel}
          {orderLabel}
        </p>
        {nextActionLabel ? (
          <p className="mt-2 text-sm font-medium text-foreground">
            Next action: {nextActionLabel}
          </p>
        ) : null}
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {nextActionLabel ? (
          <Link
            href="/followups"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
          >
            View follow-ups
          </Link>
        ) : null}
        <Button size="lg" onClick={onRecordAnother} className="w-full">
          Record another visit
        </Button>
      </div>
    </div>
  );
}
