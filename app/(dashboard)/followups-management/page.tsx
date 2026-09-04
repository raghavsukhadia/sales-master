import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { listFollowupsForAdmin } from "@/lib/business/followup-management";
import { parseFollowupManagementSearchParams } from "@/lib/validations/followup-management";
import type { FollowupManagementListResult } from "@/lib/types/followup-management";
import { FollowupManagementPageClient } from "@/components/followups/followup-management-page";
import { FollowupManagementSkeleton } from "@/components/followups/followup-management-skeleton";

interface FollowupsManagementPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function FollowupManagementData({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFollowupManagementSearchParams(searchParams);
  const supabase = await createClient();

  let result: FollowupManagementListResult;
  let errorMessage: string | null = null;

  try {
    result = await listFollowupsForAdmin(supabase, filters);
  } catch (error) {
    console.error("[followups-management] failed to load", error);
    errorMessage = "Could not load follow-ups. Please try again.";
    result = {
      items: [],
      summary: {
        overdue: 0,
        dueToday: 0,
        upcoming: 0,
        completed: 0,
        noResponse: 0,
      },
      totalCount: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      filterOptions: { salesmen: [], locations: [] },
    };
  }

  return (
    <FollowupManagementPageClient
      initialFilters={filters}
      initialResult={result}
      errorMessage={errorMessage}
    />
  );
}

export default async function FollowupsManagementPage({
  searchParams,
}: FollowupsManagementPageProps) {
  const params = await searchParams;

  return (
    <Suspense fallback={<FollowupManagementSkeleton />}>
      <FollowupManagementData searchParams={params} />
    </Suspense>
  );
}
