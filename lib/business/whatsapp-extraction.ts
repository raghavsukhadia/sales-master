import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import {
  buildWhatsAppTranscript,
  type WhatsAppTranscript,
} from "@/lib/business/whatsapp-transcript";
import {
  extractFromTranscript,
  WHATSAPP_EXTRACTION_PROMPT_VERSION,
  type ExtractionErrorCategory,
  type WhatsAppAiExtractResult,
} from "@/lib/ai/whatsapp-extractor";
import {
  WHATSAPP_EXTRACTION_SCHEMA_VERSION,
  type WhatsAppExtraction,
} from "@/lib/validations/whatsapp-extraction";
import { WHATSAPP_SESSION_TIMEOUT_SECONDS } from "@/lib/business/whatsapp-sessions";

/** Reclaim processing rows older than this (15 minutes). */
export const EXTRACTION_STALE_PROCESSING_SECONDS = 15 * 60;

/** Bound automatic extraction retries (including the first claim). */
export const MAX_EXTRACTION_ATTEMPTS = 5;

export type ExtractionClaimStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";

/**
 * Pure mirror of claim_whatsapp_sessions_for_extraction reclaim rules.
 * Used by unit tests; the authoritative implementation is the SQL RPC.
 */
export function evaluateExtractionReclaimEligibility(args: {
  status: ExtractionClaimStatus;
  attemptCount: number;
  processingStartedAt: Date | string | null;
  updatedAt: Date | string;
  now?: Date;
  staleProcessingSeconds?: number;
  maxAttempts?: number;
}): {
  blocksNewClaim: boolean;
  reclaimable: boolean;
  terminalFail: boolean;
  reason: string;
} {
  const now = args.now ?? new Date();
  const staleSeconds =
    args.staleProcessingSeconds ?? EXTRACTION_STALE_PROCESSING_SECONDS;
  const maxAttempts = args.maxAttempts ?? MAX_EXTRACTION_ATTEMPTS;
  const startedRaw = args.processingStartedAt ?? args.updatedAt;
  const startedAt =
    typeof startedRaw === "string" ? new Date(startedRaw) : startedRaw;
  const ageMs = now.getTime() - startedAt.getTime();
  const isStale = ageMs > staleSeconds * 1000;

  if (args.status === "succeeded") {
    return {
      blocksNewClaim: true,
      reclaimable: false,
      terminalFail: false,
      reason: "Successful extraction is never reclaimed",
    };
  }

  if (args.status === "processing" && !isStale) {
    return {
      blocksNewClaim: true,
      reclaimable: false,
      terminalFail: false,
      reason: "Fresh processing row is locked",
    };
  }

  if (args.attemptCount >= maxAttempts) {
    if (args.status === "failed" || (args.status === "processing" && isStale)) {
      return {
        blocksNewClaim: true,
        reclaimable: false,
        terminalFail: true,
        reason: "Exceeded max extraction attempts",
      };
    }
  }

  if (args.status === "failed" && args.attemptCount < maxAttempts) {
    return {
      blocksNewClaim: false,
      reclaimable: true,
      terminalFail: false,
      reason: "Failed row below max attempts is retryable",
    };
  }

  if (args.status === "processing" && isStale && args.attemptCount < maxAttempts) {
    return {
      blocksNewClaim: false,
      reclaimable: true,
      terminalFail: false,
      reason: "Stale processing row is reclaimable",
    };
  }

  if (args.status === "pending") {
    return {
      blocksNewClaim: false,
      reclaimable: true,
      terminalFail: false,
      reason: "Pending row is claimable",
    };
  }

  return {
    blocksNewClaim: true,
    reclaimable: false,
    terminalFail: false,
    reason: "Row is not reclaimable under current policy",
  };
}

export type ClaimedSessionExtraction = {
  sessionId: string;
  extractionId: string;
};

export type ExtractWhatsAppSessionResult =
  | {
      status: "succeeded";
      sessionId: string;
      extractionId: string;
      data: WhatsAppExtraction;
      skippedAi: boolean;
    }
  | {
      status: "failed";
      sessionId: string;
      extractionId: string;
      category: ExtractionErrorCategory;
      message: string;
    }
  | {
      status: "skipped";
      sessionId: string;
      reason: string;
    };

/**
 * Claim closed/inactive sessions ready for AI extraction.
 * Concurrent-safe via claim_whatsapp_sessions_for_extraction RPC.
 */
export async function claimSessionsForExtraction(
  supabase: SupabaseClient<Database>,
  batchSize: number = 5,
): Promise<ClaimedSessionExtraction[]> {
  const { data, error } = await supabase.rpc("claim_whatsapp_sessions_for_extraction", {
    p_schema_version: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
    p_prompt_version: WHATSAPP_EXTRACTION_PROMPT_VERSION,
    p_timeout_seconds: WHATSAPP_SESSION_TIMEOUT_SECONDS,
    batch_size: batchSize,
    p_stale_processing_seconds: EXTRACTION_STALE_PROCESSING_SECONDS,
    p_max_attempts: MAX_EXTRACTION_ATTEMPTS,
  });

  if (error) {
    console.error("[claimSessionsForExtraction] RPC failed", error);
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    sessionId: row.session_id,
    extractionId: row.extraction_id,
  }));
}

export async function loadWhatsAppTranscript(
  supabase: SupabaseClient<Database>,
  sessionId: string,
): Promise<WhatsAppTranscript> {
  const { data: session, error: sessionError } = await supabase
    .from("whatsapp_sessions")
    .select("id, salesman_id, started_at, last_message_at")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? `Session not found: ${sessionId}`);
  }

  const { data: messages, error: messagesError } = await supabase
    .from("whatsapp_messages")
    .select(
      "id, direction, message_timestamp, created_at, item_type, value, caption, file_name, file_path",
    )
    .eq("session_id", sessionId);

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  return buildWhatsAppTranscript(session, messages ?? []);
}

/**
 * Extract + validate + persist for one claimed session.
 * Does not create dealers, visits, or follow-ups.
 */
export async function extractWhatsAppSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  extractionId: string,
  options?: {
    /** Injected for tests — defaults to OpenAI-backed extractFromTranscript. */
    runAi?: (transcript: WhatsAppTranscript) => Promise<WhatsAppAiExtractResult>;
  },
): Promise<ExtractWhatsAppSessionResult> {
  const { data: existing, error: existingError } = await supabase
    .from("whatsapp_session_extractions")
    .select("id, status, parsed_output")
    .eq("id", extractionId)
    .maybeSingle();

  if (existingError) {
    return {
      status: "failed",
      sessionId,
      extractionId,
      category: "persistence",
      message: existingError.message,
    };
  }

  if (!existing) {
    return {
      status: "skipped",
      sessionId,
      reason: "Extraction row not found",
    };
  }

  if (existing.status === "succeeded" && existing.parsed_output) {
    return {
      status: "succeeded",
      sessionId,
      extractionId,
      data: existing.parsed_output as WhatsAppExtraction,
      skippedAi: true,
    };
  }

  let transcript: WhatsAppTranscript;
  try {
    transcript = await loadWhatsAppTranscript(supabase, sessionId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load transcript";
    await persistFailure(supabase, extractionId, {
      category: "persistence",
      message,
      rawOutput: null,
      validationErrors: null,
      model: null,
    });
    return {
      status: "failed",
      sessionId,
      extractionId,
      category: "persistence",
      message,
    };
  }

  const inboundCount = transcript.messages.filter((m) => m.direction === "inbound").length;
  if (inboundCount === 0) {
    const message = "Session has no inbound messages — not eligible for extraction";
    await persistFailure(supabase, extractionId, {
      category: "unknown",
      message,
      rawOutput: null,
      validationErrors: null,
      model: null,
    });
    return {
      status: "failed",
      sessionId,
      extractionId,
      category: "unknown",
      message,
    };
  }

  const runAi = options?.runAi ?? extractFromTranscript;
  const aiResult = await runAi(transcript);

  if (!aiResult.ok) {
    await persistFailure(supabase, extractionId, {
      category: aiResult.category,
      message: aiResult.message,
      rawOutput: aiResult.rawOutput,
      validationErrors: aiResult.validationErrors,
      model: aiResult.model,
    });
    return {
      status: "failed",
      sessionId,
      extractionId,
      category: aiResult.category,
      message: aiResult.message,
    };
  }

  const { error: successError } = await supabase
    .from("whatsapp_session_extractions")
    .update({
      status: "succeeded",
      model: aiResult.model,
      raw_output: aiResult.rawOutput,
      parsed_output: aiResult.data as unknown as Json,
      validation_errors: null,
      error_message: null,
      error_category: null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", extractionId)
    .eq("status", "processing");

  if (successError) {
    console.error("[extractWhatsAppSession] persist success failed", successError);
    return {
      status: "failed",
      sessionId,
      extractionId,
      category: "persistence",
      message: successError.message,
    };
  }

  return {
    status: "succeeded",
    sessionId,
    extractionId,
    data: aiResult.data,
    skippedAi: false,
  };
}

async function persistFailure(
  supabase: SupabaseClient<Database>,
  extractionId: string,
  args: {
    category: ExtractionErrorCategory;
    message: string;
    rawOutput: string | null;
    validationErrors: unknown | null;
    model: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("whatsapp_session_extractions")
    .update({
      status: "failed",
      model: args.model,
      raw_output: args.rawOutput,
      parsed_output: null,
      validation_errors: (args.validationErrors as Json) ?? null,
      error_message: args.message.slice(0, 4000),
      error_category: args.category,
      completed_at: new Date().toISOString(),
    })
    .eq("id", extractionId);

  if (error) {
    console.error("[extractWhatsAppSession] persistFailure failed", error);
  }
}
