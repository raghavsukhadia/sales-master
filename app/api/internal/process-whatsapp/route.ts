import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  claimNextMessages,
  markFailed,
  markIgnored,
  markProcessed,
} from "@/lib/business/whatsapp-processing";
import {
  copyWhatsAppMediaToStorage,
  shouldCopyWhatsAppMedia,
} from "@/lib/business/whatsapp-media";
import {
  claimSessionsForExtraction,
  extractWhatsAppSession,
} from "@/lib/business/whatsapp-extraction";
import { resolveWhatsAppExtraction } from "@/lib/business/whatsapp-business-resolution";
import { INBOUND_BOUND_TYPE } from "@/lib/validations/whatsapp";

const DEFAULT_MESSAGE_BATCH = 10;
const DEFAULT_EXTRACTION_BATCH = 5;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  return header.slice("Bearer ".length) === secret;
}

/**
 * Async WhatsApp worker:
 * 1) Claim/process individual messages (media copy, ignore outbound)
 * 2) Claim inactive/closed sessions and run AI extraction (no business mutations)
 * 3) On successful extraction, build deterministic business-resolution proposal
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let messageBatchSize = DEFAULT_MESSAGE_BATCH;
  let extractionBatchSize = DEFAULT_EXTRACTION_BATCH;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.batchSize === "number" && body.batchSize >= 1 && body.batchSize <= 50) {
      messageBatchSize = body.batchSize;
    }
    if (
      typeof body?.extractionBatchSize === "number" &&
      body.extractionBatchSize >= 1 &&
      body.extractionBatchSize <= 20
    ) {
      extractionBatchSize = body.extractionBatchSize;
    }
  } catch {
    // empty body is fine
  }

  const supabase = createServiceClient();
  const claimed = await claimNextMessages(supabase, messageBatchSize);

  const summary = {
    claimed: claimed.length,
    processed: 0,
    ignored: 0,
    failed: 0,
    extractionsClaimed: 0,
    extractionsSucceeded: 0,
    extractionsFailed: 0,
    extractionsSkipped: 0,
    resolutionsSucceeded: 0,
    resolutionsFailed: 0,
    resolutionsSkipped: 0,
  };

  for (const message of claimed) {
    try {
      if (message.direction !== INBOUND_BOUND_TYPE) {
        await markIgnored(supabase, message.id, "Outbound message — not salesman input");
        summary.ignored += 1;
        continue;
      }

      // Web-sourced voice notes already live in visit-attachments; skip remote copy.
      if (message.source === "web") {
        await markProcessed(supabase, message.id);
        summary.processed += 1;
        continue;
      }

      if (shouldCopyWhatsAppMedia(message)) {
        const copyResult = await copyWhatsAppMediaToStorage(supabase, message);
        if (!copyResult.ok) {
          await markFailed(supabase, message.id, copyResult.error);
          summary.failed += 1;
          continue;
        }
      }

      await markProcessed(supabase, message.id);
      summary.processed += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown processing error";
      console.error(`[process-whatsapp] message ${message.id} failed`, err);
      try {
        await markFailed(supabase, message.id, msg);
      } catch (markErr) {
        console.error(`[process-whatsapp] markFailed also failed for ${message.id}`, markErr);
      }
      summary.failed += 1;
    }
  }

  // Session-level extraction after message work (never in the webhook).
  try {
    const claimedSessions = await claimSessionsForExtraction(supabase, extractionBatchSize);
    summary.extractionsClaimed = claimedSessions.length;

    for (const claimedSession of claimedSessions) {
      try {
        const result = await extractWhatsAppSession(
          supabase,
          claimedSession.sessionId,
          claimedSession.extractionId,
        );
        if (result.status === "succeeded") {
          summary.extractionsSucceeded += 1;
          try {
            const resolution = await resolveWhatsAppExtraction(
              supabase,
              claimedSession.extractionId,
            );
            if (resolution.status === "succeeded") {
              summary.resolutionsSucceeded += 1;
            } else if (resolution.status === "failed") {
              summary.resolutionsFailed += 1;
              console.error(
                `[process-whatsapp] resolution failed extraction=${claimedSession.extractionId}`,
                resolution.message,
              );
            } else {
              summary.resolutionsSkipped += 1;
            }
          } catch (resErr) {
            summary.resolutionsFailed += 1;
            console.error(
              `[process-whatsapp] resolution threw extraction=${claimedSession.extractionId}`,
              resErr,
            );
          }
        } else if (result.status === "failed") {
          summary.extractionsFailed += 1;
          console.error(
            `[process-whatsapp] extraction failed session=${result.sessionId} category=${result.category}`,
            result.message,
          );
        } else {
          summary.extractionsSkipped += 1;
        }
      } catch (err) {
        summary.extractionsFailed += 1;
        console.error(
          `[process-whatsapp] extraction threw session=${claimedSession.sessionId}`,
          err,
        );
      }
    }
  } catch (err) {
    console.error("[process-whatsapp] claimSessionsForExtraction failed", err);
  }

  return NextResponse.json({ ok: true, ...summary });
}

/** Vercel Cron uses GET by default for some schedules; accept GET with same auth. */
export async function GET(request: NextRequest) {
  return POST(request);
}
