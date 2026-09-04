"use client";

import { useState } from "react";
import Link from "next/link";
import { History, IdCard, X } from "lucide-react";
import type { PreviousVisitSummary, VisitAttachment } from "@/lib/types/visit-history";
import { VisitFiltersSheet } from "./visit-filters-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OpenSheet = "card" | "timeline" | null;

interface VisitSecondaryActionsProps {
  attachments: VisitAttachment[];
  previousVisits: PreviousVisitSummary[];
  /** `sidebar` — compact Card/Timeline for the header right column. */
  variant?: "default" | "sidebar";
  /** Base path for previous visit links. Defaults to salesman `/visit-history`. */
  visitDetailBasePath?: string;
}

export function VisitSecondaryActions({
  attachments,
  previousVisits,
  variant = "default",
  visitDetailBasePath = "/visit-history",
}: VisitSecondaryActionsProps) {
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);
  const hasCard = attachments.length > 0;
  const hasTimeline = previousVisits.length > 0;
  const isSidebar = variant === "sidebar";

  function close() {
    setOpenSheet(null);
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          isSidebar ? "grid-cols-2 sm:grid-cols-1" : "grid-cols-2",
        )}
      >
        <Button
          type="button"
          variant="outline"
          size={isSidebar ? "sm" : "lg"}
          className={cn("gap-1.5", isSidebar ? "w-full justify-center px-2" : "w-full gap-2")}
          disabled={!hasCard}
          title={hasCard ? undefined : "No visiting card"}
          onClick={() => setOpenSheet("card")}
        >
          <IdCard className={cn(isSidebar ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
          {isSidebar ? "Card" : "Visiting card"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size={isSidebar ? "sm" : "lg"}
          className={cn("gap-1.5", isSidebar ? "w-full justify-center px-2" : "w-full gap-2")}
          disabled={!hasTimeline}
          title={hasTimeline ? undefined : "No previous visits"}
          onClick={() => setOpenSheet("timeline")}
        >
          <History className={cn(isSidebar ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
          {isSidebar ? "Timeline" : "Visit timeline"}
        </Button>
      </div>

      <VisitFiltersSheet
        open={openSheet === "card"}
        onClose={close}
        ariaLabel="Visiting card"
        size="content"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Visiting card</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={close}
            >
              <X className="h-4 w-4" aria-hidden />
              Close
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {attachments.map((attachment) => (
              <figure key={attachment.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.url}
                  alt="Visiting card"
                  className="max-h-80 w-full rounded-lg border border-border/60 bg-muted/30 object-contain"
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        </div>
      </VisitFiltersSheet>

      <VisitFiltersSheet
        open={openSheet === "timeline"}
        onClose={close}
        ariaLabel="Visit history"
        size="content"
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold tracking-tight">Visit history</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={close}
            >
              <X className="h-4 w-4" aria-hidden />
              Close
            </Button>
          </div>

          {previousVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previous visits.</p>
          ) : (
            <ol className="relative m-0 list-none p-0">
              {previousVisits.map((previous, index) => {
                const isLast = index === previousVisits.length - 1;
                const dateText = new Date(previous.visitedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <li key={previous.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {!isLast ? (
                      <span
                        className="absolute top-2.5 left-[5px] h-[calc(100%-4px)] w-px bg-border/80"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-border bg-background"
                      aria-hidden
                    />
                    <Link
                      href={`${visitDetailBasePath}/${previous.id}`}
                      onClick={close}
                      className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="text-sm font-medium text-foreground hover:text-primary">
                        {dateText}
                      </p>
                      {previous.visitNumber ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {previous.visitNumber}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </VisitFiltersSheet>
    </>
  );
}
