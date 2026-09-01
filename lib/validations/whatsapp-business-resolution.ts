import { z } from "zod";

export const WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION = "1" as const;
export const WHATSAPP_BUSINESS_RESOLVER_VERSION = "v1" as const;

const dealerResolutionSchema = z
  .object({
    status: z.enum(["matched", "ambiguous", "not_found", "insufficient_data"]),
    proposedDealerId: z.string().uuid().nullable(),
    candidateDealerIds: z.array(z.string().uuid()),
    normalizedPhone: z.string().nullable(),
    extractedName: z.string().nullable(),
    reason: z.string(),
  })
  .strict();

const visitResolutionSchema = z
  .object({
    applicable: z.boolean(),
    occurred: z.boolean().nullable(),
    resolvedDate: z.string().nullable(),
    resolvedTime: z.string().nullable(),
    outcome: z.string().nullable(),
    notes: z.string().nullable(),
    ready: z.boolean(),
    missingFields: z.array(z.string()),
  })
  .strict();

const followUpResolutionSchema = z
  .object({
    applicable: z.boolean(),
    requested: z.boolean().nullable(),
    resolvedDate: z.string().nullable(),
    reason: z.string().nullable(),
    ready: z.boolean(),
    missingFields: z.array(z.string()),
  })
  .strict();

export const whatsappBusinessResolutionSchema = z
  .object({
    schemaVersion: z.literal(WHATSAPP_BUSINESS_RESOLUTION_SCHEMA_VERSION),
    resolverVersion: z.literal(WHATSAPP_BUSINESS_RESOLVER_VERSION),
    extractionId: z.string().uuid(),
    sessionId: z.string().uuid(),
    intent: z.object({
      type: z.enum([
        "visit_report",
        "follow_up",
        "dealer_update",
        "mixed",
        "unknown",
      ]),
    }),
    dealerResolution: dealerResolutionSchema,
    visitResolution: visitResolutionSchema,
    followUpResolution: followUpResolutionSchema,
    overall: z
      .object({
        status: z.enum([
          "ready_for_confirmation",
          "needs_clarification",
          "not_actionable",
        ]),
        reasons: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export type WhatsAppBusinessResolution = z.infer<
  typeof whatsappBusinessResolutionSchema
>;

export function parseWhatsAppBusinessResolution(input: unknown) {
  const result = whatsappBusinessResolutionSchema.safeParse(input);
  if (result.success) return { ok: true as const, data: result.data };
  return { ok: false as const, errors: result.error };
}
