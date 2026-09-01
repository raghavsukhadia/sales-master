import { z } from "zod";

/** Persisted with every extraction row — bump when the JSON shape changes. */
export const WHATSAPP_EXTRACTION_SCHEMA_VERSION = "1" as const;

const confidenceSchema = z.object({
  overall: z.number().min(0).max(1),
});

const dealerExtractionSchema = z
  .object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    locality: z.string().nullable(),
    city: z.string().nullable(),
    address: z.string().nullable(),
  })
  .strict();

const visitExtractionSchema = z
  .object({
    occurred: z.boolean().nullable(),
    dateText: z.string().nullable(),
    timeText: z.string().nullable(),
    outcome: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .strict();

const followUpExtractionSchema = z
  .object({
    requested: z.boolean().nullable(),
    dateText: z.string().nullable(),
    reason: z.string().nullable(),
  })
  .strict();

const productExtractionSchema = z
  .object({
    name: z.string().min(1),
    quantityText: z.string().nullable(),
    priceText: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .strict();

const ambiguitySchema = z
  .object({
    field: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

/**
 * Versioned WhatsApp session extraction schema.
 * Descriptive only — never includes dealer/visit/salesman/database IDs.
 */
export const whatsappExtractionSchema = z
  .object({
    schemaVersion: z.literal(WHATSAPP_EXTRACTION_SCHEMA_VERSION),
    conversationIntent: z.enum([
      "visit_report",
      "follow_up",
      "dealer_update",
      "mixed",
      "unknown",
    ]),
    dealer: dealerExtractionSchema,
    visit: visitExtractionSchema,
    followUp: followUpExtractionSchema,
    products: z.array(productExtractionSchema),
    summary: z.string(),
    missingFields: z.array(z.string()),
    ambiguities: z.array(ambiguitySchema),
    confidence: confidenceSchema,
  })
  .strict();

export type WhatsAppExtraction = z.infer<typeof whatsappExtractionSchema>;

export type WhatsAppExtractionParseResult =
  | { ok: true; data: WhatsAppExtraction }
  | { ok: false; errors: z.ZodError };

export function parseWhatsAppExtraction(input: unknown): WhatsAppExtractionParseResult {
  const result = whatsappExtractionSchema.safeParse(input);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, errors: result.error };
}
