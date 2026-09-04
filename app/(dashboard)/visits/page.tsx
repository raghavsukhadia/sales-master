import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { listVisitsForAdmin } from "@/lib/business/visit-activity";
import { parseVisitActivitySearchParams } from "@/lib/validations/visit-activity";
import type { VisitActivityListResult } from "@/lib/types/visit-activity";
import { VisitActivityPageClient } from "@/components/visits/visit-activity-page";
import { VisitActivitySkeleton } from "@/components/visits/visit-activity-skeleton";

interface VisitsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function VisitActivityData({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseVisitActivitySearchParams(searchParams);
  const supabase = await createClient();

  let result: VisitActivityListResult;
  let errorMessage: string | null = null;

  try {
    result = await listVisitsForAdmin(supabase, filters);
  } catch (error) {
    console.error("[visits] failed to load visit activity", error);
    errorMessage = "Could not load visit activity. Please try again.";
    result = {
      items: [],
      summary: {
        totalVisits: 0,
        activeSalesmen: 0,
        newDealers: 0,
        orders: 0,
        followUpsDue: 0,
      },
      totalCount: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      filterOptions: { salesmen: [], locations: [] },
    };
  }

  return (
    <VisitActivityPageClient
      initialFilters={filters}
      initialResult={result}
      errorMessage={errorMessage}
    />
  );
}

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
  const params = await searchParams;

  return (
    <Suspense fallback={<VisitActivitySkeleton />}>
      <VisitActivityData searchParams={params} />
    </Suspense>
  );
}
