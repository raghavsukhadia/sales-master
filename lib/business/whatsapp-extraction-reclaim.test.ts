import { describe, expect, it } from "vitest";
import {
  evaluateExtractionReclaimEligibility,
  EXTRACTION_STALE_PROCESSING_SECONDS,
  MAX_EXTRACTION_ATTEMPTS,
} from "./whatsapp-extraction";

const NOW = new Date("2026-08-20T12:00:00.000Z");

function minutesAgo(mins: number): string {
  return new Date(NOW.getTime() - mins * 60_000).toISOString();
}

describe("evaluateExtractionReclaimEligibility", () => {
  it("does not reclaim fresh processing rows", () => {
    const result = evaluateExtractionReclaimEligibility({
      status: "processing",
      attemptCount: 1,
      processingStartedAt: minutesAgo(5),
      updatedAt: minutesAgo(5),
      now: NOW,
      staleProcessingSeconds: EXTRACTION_STALE_PROCESSING_SECONDS,
      maxAttempts: MAX_EXTRACTION_ATTEMPTS,
    });
    expect(result.reclaimable).toBe(false);
    expect(result.blocksNewClaim).toBe(true);
  });

  it("reclaims stale processing rows under max attempts", () => {
    const result = evaluateExtractionReclaimEligibility({
      status: "processing",
      attemptCount: 2,
      processingStartedAt: minutesAgo(20),
      updatedAt: minutesAgo(20),
      now: NOW,
      staleProcessingSeconds: EXTRACTION_STALE_PROCESSING_SECONDS,
      maxAttempts: MAX_EXTRACTION_ATTEMPTS,
    });
    expect(result.reclaimable).toBe(true);
    expect(result.terminalFail).toBe(false);
  });

  it("never reclaims succeeded extractions", () => {
    const result = evaluateExtractionReclaimEligibility({
      status: "succeeded",
      attemptCount: 1,
      processingStartedAt: minutesAgo(60),
      updatedAt: minutesAgo(60),
      now: NOW,
    });
    expect(result.reclaimable).toBe(false);
    expect(result.blocksNewClaim).toBe(true);
  });

  it("retries failed rows below max attempts", () => {
    const result = evaluateExtractionReclaimEligibility({
      status: "failed",
      attemptCount: 3,
      processingStartedAt: null,
      updatedAt: minutesAgo(1),
      now: NOW,
      maxAttempts: MAX_EXTRACTION_ATTEMPTS,
    });
    expect(result.reclaimable).toBe(true);
    expect(result.terminalFail).toBe(false);
  });

  it("marks exhausted attempts as terminal non-retryable", () => {
    const failed = evaluateExtractionReclaimEligibility({
      status: "failed",
      attemptCount: MAX_EXTRACTION_ATTEMPTS,
      processingStartedAt: null,
      updatedAt: minutesAgo(1),
      now: NOW,
    });
    expect(failed.reclaimable).toBe(false);
    expect(failed.terminalFail).toBe(true);

    const staleMax = evaluateExtractionReclaimEligibility({
      status: "processing",
      attemptCount: MAX_EXTRACTION_ATTEMPTS,
      processingStartedAt: minutesAgo(30),
      updatedAt: minutesAgo(30),
      now: NOW,
    });
    expect(staleMax.reclaimable).toBe(false);
    expect(staleMax.terminalFail).toBe(true);
  });

  it("defaults stale window to 15 minutes", () => {
    expect(EXTRACTION_STALE_PROCESSING_SECONDS).toBe(900);
    expect(MAX_EXTRACTION_ATTEMPTS).toBe(5);
  });
});
