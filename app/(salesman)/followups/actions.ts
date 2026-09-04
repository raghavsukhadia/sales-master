"use server";

import { createClient } from "@/lib/supabase/server";
import { listSalesmanFollowups, recordFollowupOutcome } from "@/lib/business/followups";
import {
  recordFollowupOutcomeSchema,
  type RecordFollowupOutcomeInput,
} from "@/lib/validations/followup-outcome";
import type { GroupedFollowups, FollowupsSummary } from "@/lib/types/followups";

export interface FetchSalesmanFollowupsResult {
  success: boolean;
  error?: string;
  grouped?: GroupedFollowups;
  summary?: FollowupsSummary;
}

export interface RecordFollowupOutcomeActionResult {
  success: boolean;
  error?: string;
  followupId?: string;
  nextFollowupId?: string;
  alreadyCompleted?: boolean;
}

export async function fetchSalesmanFollowupsAction(): Promise<FetchSalesmanFollowupsResult> {
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
    const { grouped, summary } = await listSalesmanFollowups(supabase, salesmanId);
    return { success: true, grouped, summary };
  } catch {
    return { success: false, error: "Couldn't load follow-ups." };
  }
}

export async function recordFollowupOutcomeAction(
  input: RecordFollowupOutcomeInput,
): Promise<RecordFollowupOutcomeActionResult> {
  const parsed = recordFollowupOutcomeSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { success: false, error: message };
  }

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

  const result = await recordFollowupOutcome(supabase, {
    followupId: parsed.data.followupId,
    salesmanId,
    userId: user.id,
    outcome: parsed.data.outcome,
    note: parsed.data.note,
    nextDueDate: parsed.data.nextDueDate,
  });

  return {
    success: result.success,
    error: result.error,
    followupId: result.followupId,
    nextFollowupId: result.nextFollowupId,
    alreadyCompleted: result.alreadyCompleted,
  };
}
