import { Suspense } from "react";
import { FollowupsPage } from "@/components/salesman/followups/followups-page";
import { FollowupsSkeleton } from "@/components/salesman/followups/followups-skeleton";

export default function FollowupsRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
            <p className="text-sm text-muted-foreground">Call dealers and record outcomes quickly.</p>
          </div>
          <FollowupsSkeleton />
        </div>
      }
    >
      <FollowupsPage />
    </Suspense>
  );
}
