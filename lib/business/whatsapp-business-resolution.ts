import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import { matchDealer } from "@/lib/business/dealer-matching";
import { normalizeIndianMobile } from "@/lib/utils/phone";
import { resolveBusinessDate } from "@/lib/business/whatsapp-date-resolution";
import {
  parseWhatsAppExtraction,
  type WhatsAppExtraction,
} from "@/lib/validations/whatsapp-extraction";
import {
  parseWhatsAppBusinessResolution,
  WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION,
  WHATSAPP_BUSINESS_RESOLVER_VERSION,
  type WhatsAppBusinessResolution,
} from "@/lib/validations/whatsapp-business-resolution";

/**
 * Pure readiness / status helpers — unit-tested without Supabase.
 * Mirrors /log-visit: visit needs a dealer; notes optional; follow-up needs
 * description + due date when requested.
 */

export type DealerResolutionInput = {
  name: string | null;
  phone: string | null;
  city: string | null;
};

export function classifyDealerIdentity(
  input: DealerResolutionInput,
): "insufficient_data" | "identifiable" {
  const hasName = Boolean(input.name?.trim());
  const hasPhone = Boolean(input.phone?.trim() && normalizeIndianMobile(input.phone!));
  if (!hasName && !hasPhone) return "insufficient_data";
  return "identifiable";
}

export function computeVisitReadiness(args: {
  intent: WhatsAppExtraction["conversationIntent"];
  dealerStatus: WhatsAppBusinessResolution["dealerResolution"]["status"];
  occurred: boolean | null;
  dateResolved: boolean;
  dateText: string | null;
}): { applicable: boolean; ready: boolean; missingFields: string[] } {
  const visitIntents = new Set(["visit_report", "mixed", "dealer_update"]);
  const applicable =
    visitIntents.has(args.intent) || args.occurred === true;

  if (!applicable) {
    return { applicable: false, ready: false, missingFields: [] };
  }

  const missingFields: string[] = [];
  if (args.dealerStatus !== "matched") {
    missingFields.push("dealerResolution.proposedDealerId");
  }
  if (args.occurred !== true) {
    // log-visit always creates a visit when submitting; for WhatsApp we require
    // an explicit occurred=true for visit applicability readiness.
    missingFields.push("visit.occurred");
  }
  if (!args.dateResolved) {
    if (args.dateText?.trim()) missingFields.push("visit.resolvedDate");
    else missingFields.push("visit.dateText");
  }

  return {
    applicable: true,
    ready: missingFields.length === 0,
    missingFields,
  };
}

export function computeFollowUpReadiness(args: {
  intent: WhatsAppExtraction["conversationIntent"];
  dealerStatus: WhatsAppBusinessResolution["dealerResolution"]["status"];
  requested: boolean | null;
  reason: string | null;
  dateResolved: boolean;
  dateText: string | null;
}): { applicable: boolean; ready: boolean; missingFields: string[] } {
  const applicable =
    args.requested === true ||
    args.intent === "follow_up" ||
    (args.intent === "mixed" && Boolean(args.dateText?.trim() || args.reason?.trim()));

  if (!applicable) {
    return { applicable: false, ready: false, missingFields: [] };
  }

  const missingFields: string[] = [];
  if (args.dealerStatus !== "matched") {
    missingFields.push("dealerResolution.proposedDealerId");
  }
  if (args.requested !== true && args.intent !== "follow_up") {
    missingFields.push("followUp.requested");
  }
  // log-visit: description + due_date both required for follow-up insert
  if (!args.reason?.trim()) {
    missingFields.push("followUp.reason");
  }
  if (!args.dateResolved) {
    if (args.dateText?.trim()) missingFields.push("followUp.resolvedDate");
    else missingFields.push("followUp.dateText");
  }

  return {
    applicable: true,
    ready: missingFields.length === 0,
    missingFields,
  };
}

export function computeOverallStatus(args: {
  intent: WhatsAppExtraction["conversationIntent"];
  dealerStatus: WhatsAppBusinessResolution["dealerResolution"]["status"];
  visit: { applicable: boolean; ready: boolean };
  followUp: { applicable: boolean; ready: boolean };
  ambiguities: Array<{ field: string; reason: string }>;
}): {
  status: WhatsAppBusinessResolution["overall"]["status"];
  reasons: string[];
} {
  const reasons: string[] = [];

  if (!args.visit.applicable && !args.followUp.applicable) {
    return {
      status: "not_actionable",
      reasons:
        args.intent === "unknown"
          ? ["Conversation intent is unknown and no visit/follow-up action is applicable"]
          : ["No applicable visit or follow-up action"],
    };
  }

  if (args.dealerStatus === "ambiguous") {
    reasons.push("Dealer match is ambiguous");
  } else if (args.dealerStatus === "not_found") {
    reasons.push("No existing dealer match found");
  } else if (args.dealerStatus === "insufficient_data") {
    reasons.push("Insufficient dealer identifying information");
  }

  if (args.visit.applicable && !args.visit.ready) {
    reasons.push("Visit is not ready for confirmation");
  }
  if (args.followUp.applicable && !args.followUp.ready) {
    reasons.push("Follow-up is not ready for confirmation");
  }

  for (const a of args.ambiguities) {
    reasons.push(`Ambiguity: ${a.field} — ${a.reason}`);
  }

  const dealerBlocking =
    (args.visit.applicable || args.followUp.applicable) &&
    args.dealerStatus !== "matched";
  const visitBlocking = args.visit.applicable && !args.visit.ready;
  const followUpBlocking = args.followUp.applicable && !args.followUp.ready;

  if (dealerBlocking || visitBlocking || followUpBlocking || args.ambiguities.length > 0) {
    return { status: "needs_clarification", reasons };
  }

  return { status: "ready_for_confirmation", reasons: [] };
}

export type ResolveWhatsAppExtractionResult =
  | {
      status: "succeeded";
      resolutionId: string;
      resolution: WhatsAppBusinessResolution;
      skippedRebuild: boolean;
    }
  | {
      status: "failed";
      message: string;
    }
  | {
      status: "skipped";
      reason: string;
    };

/**
 * Build a business-resolution proposal from a successful extraction.
 * Never mutates dealers/visits/follow-ups.
 */
export async function resolveWhatsAppExtraction(
  supabase: SupabaseClient<Database>,
  extractionId: string,
): Promise<ResolveWhatsAppExtractionResult> {
  const { data: existingResolution } = await supabase
    .from("whatsapp_session_business_resolutions")
    .select("id, resolution")
    .eq("extraction_id", extractionId)
    .eq("schema_version", WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION)
    .eq("resolver_version", WHATSAPP_BUSINESS_RESOLVER_VERSION)
    .maybeSingle();

  if (existingResolution?.resolution) {
    const parsed = parseWhatsAppBusinessResolution(existingResolution.resolution);
    if (parsed.ok) {
      return {
        status: "succeeded",
        resolutionId: existingResolution.id,
        resolution: parsed.data,
        skippedRebuild: true,
      };
    }
  }

  const { data: extraction, error: extractionError } = await supabase
    .from("whatsapp_session_extractions")
    .select("id, session_id, status, parsed_output")
    .eq("id", extractionId)
    .maybeSingle();

  if (extractionError || !extraction) {
    return {
      status: "failed",
      message: extractionError?.message ?? "Extraction not found",
    };
  }

  if (extraction.status !== "succeeded" || !extraction.parsed_output) {
    return {
      status: "skipped",
      reason: "Extraction is not succeeded with parsed_output",
    };
  }

  const extracted = parseWhatsAppExtraction(extraction.parsed_output);
  if (!extracted.ok) {
    return {
      status: "failed",
      message: "Stored extraction failed Zod re-validation",
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from("whatsapp_sessions")
    .select("id, last_message_at, started_at")
    .eq("id", extraction.session_id)
    .single();

  if (sessionError || !session) {
    return {
      status: "failed",
      message: sessionError?.message ?? "Session not found",
    };
  }

  const referenceInstant = session.last_message_at || session.started_at;
  const data = extracted.data;

  const normalizedPhone = data.dealer.phone
    ? normalizeIndianMobile(data.dealer.phone)
    : null;

  const identity = classifyDealerIdentity({
    name: data.dealer.name,
    phone: data.dealer.phone,
    city: data.dealer.city,
  });

  let dealerResolution: WhatsAppBusinessResolution["dealerResolution"];

  if (identity === "insufficient_data") {
    dealerResolution = {
      status: "insufficient_data",
      proposedDealerId: null,
      candidateDealerIds: [],
      normalizedPhone,
      extractedName: data.dealer.name,
      reason: "No usable dealer name or normalized phone",
    };
  } else {
    const match = await matchDealer(supabase, {
      phone: data.dealer.phone,
      businessName: data.dealer.name,
      city: data.dealer.city,
    });

    if (match.status === "exact_match") {
      dealerResolution = {
        status: "matched",
        proposedDealerId: match.dealer.id,
        candidateDealerIds: [match.dealer.id],
        normalizedPhone,
        extractedName: data.dealer.name,
        reason: "Unique deterministic dealer match",
      };
    } else if (match.status === "possible_matches") {
      dealerResolution = {
        status: "ambiguous",
        proposedDealerId: null,
        candidateDealerIds: match.candidates.map((c) => c.id),
        normalizedPhone,
        extractedName: data.dealer.name,
        reason: `Multiple possible dealers (${match.candidates.length})`,
      };
    } else {
      dealerResolution = {
        status: "not_found",
        proposedDealerId: null,
        candidateDealerIds: [],
        normalizedPhone,
        extractedName: data.dealer.name,
        reason: "No existing dealer match",
      };
    }
  }

  const visitDate = resolveBusinessDate(data.visit.dateText, referenceInstant);
  const followUpDate = resolveBusinessDate(data.followUp.dateText, referenceInstant);

  const visitReady = computeVisitReadiness({
    intent: data.conversationIntent,
    dealerStatus: dealerResolution.status,
    occurred: data.visit.occurred,
    dateResolved: visitDate.status === "resolved",
    dateText: data.visit.dateText,
  });

  const followUpReady = computeFollowUpReadiness({
    intent: data.conversationIntent,
    dealerStatus: dealerResolution.status,
    requested: data.followUp.requested,
    reason: data.followUp.reason,
    dateResolved: followUpDate.status === "resolved",
    dateText: data.followUp.dateText,
  });

  // Surface date ambiguity into missing/clarification path
  if (visitReady.applicable && visitDate.status === "ambiguous") {
    visitReady.ready = false;
    if (!visitReady.missingFields.includes("visit.resolvedDate")) {
      visitReady.missingFields.push("visit.resolvedDate");
    }
  }
  if (followUpReady.applicable && followUpDate.status === "ambiguous") {
    followUpReady.ready = false;
    if (!followUpReady.missingFields.includes("followUp.resolvedDate")) {
      followUpReady.missingFields.push("followUp.resolvedDate");
    }
  }

  const overall = computeOverallStatus({
    intent: data.conversationIntent,
    dealerStatus: dealerResolution.status,
    visit: visitReady,
    followUp: followUpReady,
    ambiguities: [
      ...data.ambiguities,
      ...(visitDate.status === "ambiguous"
        ? [{ field: "visit.dateText", reason: visitDate.reason }]
        : []),
      ...(followUpDate.status === "ambiguous"
        ? [{ field: "followUp.dateText", reason: followUpDate.reason }]
        : []),
    ],
  });

  const resolution: WhatsAppBusinessResolution = {
    schemaVersion: WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION,
    resolverVersion: WHATSAPP_BUSINESS_RESOLVER_VERSION,
    extractionId,
    sessionId: extraction.session_id,
    intent: { type: data.conversationIntent },
    dealerResolution,
    visitResolution: {
      applicable: visitReady.applicable,
      occurred: data.visit.occurred,
      resolvedDate: visitDate.status === "resolved" ? visitDate.value : null,
      resolvedTime: data.visit.timeText,
      outcome: data.visit.outcome,
      notes: data.visit.notes,
      ready: visitReady.ready,
      missingFields: visitReady.missingFields,
    },
    followUpResolution: {
      applicable: followUpReady.applicable,
      requested: data.followUp.requested,
      resolvedDate: followUpDate.status === "resolved" ? followUpDate.value : null,
      reason: data.followUp.reason,
      ready: followUpReady.ready,
      missingFields: followUpReady.missingFields,
    },
    overall,
  };

  const validated = parseWhatsAppBusinessResolution(resolution);
  if (!validated.ok) {
    return {
      status: "failed",
      message: "Built resolution failed Zod validation",
    };
  }

  const { data: upserted, error: upsertError } = await supabase
    .from("whatsapp_session_business_resolutions")
    .upsert(
      {
        session_id: extraction.session_id,
        extraction_id: extractionId,
        schema_version: WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION,
        resolver_version: WHATSAPP_BUSINESS_RESOLVER_VERSION,
        status: validated.data.overall.status,
        resolution: validated.data as unknown as Json,
        proposed_dealer_id: validated.data.dealerResolution.proposedDealerId,
        resolved_visit_date: validated.data.visitResolution.resolvedDate,
        resolved_follow_up_date: validated.data.followUpResolution.resolvedDate,
        error_message: null,
        attempt_count: 1,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "extraction_id,schema_version,resolver_version" },
    )
    .select("id")
    .single();

  if (upsertError || !upserted) {
    return {
      status: "failed",
      message: upsertError?.message ?? "Failed to persist business resolution",
    };
  }

  return {
    status: "succeeded",
    resolutionId: upserted.id,
    resolution: validated.data,
    skippedRebuild: false,
  };
}
