import { describe, expect, it } from "vitest";
import {
  parseWhatsAppBusinessResolution,
  WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION,
  WHATSAPP_BUSINESS_RESOLVER_VERSION,
  whatsappBusinessResolutionSchema,
} from "./whatsapp-business-resolution";

const extractionId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const dealerId = "33333333-3333-4333-8333-333333333333";

const validResolution = {
  schemaVersion: WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION,
  resolverVersion: WHATSAPP_BUSINESS_RESOLVER_VERSION,
  extractionId,
  sessionId,
  intent: { type: "mixed" as const },
  dealerResolution: {
    status: "matched" as const,
    proposedDealerId: dealerId,
    candidateDealerIds: [dealerId],
    normalizedPhone: null,
    extractedName: "Gupta Electricals",
    reason: "Unique deterministic dealer match",
  },
  visitResolution: {
    applicable: true,
    occurred: true,
    resolvedDate: "2026-08-20",
    resolvedTime: null,
    outcome: "Interested",
    notes: null,
    ready: true,
    missingFields: [] as string[],
  },
  followUpResolution: {
    applicable: true,
    requested: true,
    resolvedDate: "2026-08-24",
    reason: "Discuss order",
    ready: true,
    missingFields: [] as string[],
  },
  overall: {
    status: "ready_for_confirmation" as const,
    reasons: [] as string[],
  },
};

describe("whatsappBusinessResolutionSchema", () => {
  it("accepts a complete ready_for_confirmation proposal", () => {
    const result = whatsappBusinessResolutionSchema.safeParse(validResolution);
    expect(result.success).toBe(true);
  });

  it("rejects extra keys (strict)", () => {
    const result = parseWhatsAppBusinessResolution({
      ...validResolution,
      extra: true,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid overall status", () => {
    const result = parseWhatsAppBusinessResolution({
      ...validResolution,
      overall: { status: "auto_create", reasons: [] },
    });
    expect(result.ok).toBe(false);
  });

  it("accepts needs_clarification / not_actionable", () => {
    for (const status of ["needs_clarification", "not_actionable"] as const) {
      const result = parseWhatsAppBusinessResolution({
        ...validResolution,
        overall: { status, reasons: ["x"] },
      });
      expect(result.ok).toBe(true);
    }
  });
});
