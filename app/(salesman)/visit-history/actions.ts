"use server";

import { createClient } from "@/lib/supabase/server";
import { getVisitDetail, listVisitsForSalesman } from "@/lib/business/visit-history";
import { loadVisitImageAttachments } from "@/lib/business/visit-attachments.server";
import type { VisitHistoryDetail, VisitHistoryFilters } from "@/lib/types/visit-history";

export interface FetchVisitHistoryResult {
  success: boolean;
  error?: string;
  items?: Awaited<ReturnType<typeof listVisitsForSalesman>>["items"];
  summary?: Awaited<ReturnType<typeof listVisitsForSalesman>>["summary"];
  cities?: string[];
}

export interface FetchVisitDetailResult {
  success: boolean;
  error?: string;
  visit?: VisitHistoryDetail;
}

export async function fetchVisitHistoryAction(
  filters: VisitHistoryFilters,
): Promise<FetchVisitHistoryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const { data: salesmanId } = await supabase.rpc("current_salesman_id");
  if (!salesmanId) {
    return { success: false, error: "Your account isn't linked to a salesman profile." };
  }

  try {
    const result = await listVisitsForSalesman(supabase, salesmanId, filters);
    return {
      success: true,
      items: result.items,
      summary: result.summary,
      cities: result.cities,
    };
  } catch {
    return { success: false, error: "Couldn't load visit history." };
  }
}

export async function fetchVisitDetailAction(visitId: string): Promise<FetchVisitDetailResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const { data: salesmanId } = await supabase.rpc("current_salesman_id");
  if (!salesmanId) {
    return { success: false, error: "Your account isn't linked to a salesman profile." };
  }

  try {
    const visit = await getVisitDetail(supabase, visitId);
    if (!visit) {
      return { success: false, error: "Visit not found." };
    }
    const attachments = await loadVisitImageAttachments(supabase, visitId);
    return { success: true, visit: { ...visit, attachments } };
  } catch {
    return { success: false, error: "Couldn't load visit details." };
  }
}
