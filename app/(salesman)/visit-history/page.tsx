import { Suspense } from "react";
import { VisitHistoryPage } from "@/components/salesman/visit-history/visit-history-page";
import { VisitHistorySkeleton } from "@/components/salesman/visit-history/visit-history-skeleton";

export default function VisitHistoryRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Visit History</h1>
            <p className="text-sm text-muted-foreground">
              Review your dealer visits, orders and follow-ups.
            </p>
          </div>
          <VisitHistorySkeleton />
        </div>
      }
    >
      <VisitHistoryPage />
    </Suspense>
  );
}
