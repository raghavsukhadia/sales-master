"use server";

import { createClient } from "@/lib/supabase/server";
import { getFollowupDetailForAdmin } from "@/lib/business/followup-management";
import type { FollowupManagementDetail } from "@/lib/types/followup-management";

export async function fetchFollowupDetailAction(
  followupId: string,
): Promise<{ success: boolean; detail?: FollowupManagementDetail; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not signed in." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    return { success: false, error: "You don't have permission to view follow-ups." };
  }

  try {
    const detail = await getFollowupDetailForAdmin(supabase, followupId);
    if (!detail) return { success: false, error: "Follow-up not found." };
    return { success: true, detail };
  } catch {
    return { success: false, error: "Could not load follow-up details." };
  }
}
