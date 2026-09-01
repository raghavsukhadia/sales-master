import { z } from "zod";

export const VISITING_CARD_EXTRACTION_SCHEMA_VERSION = "1" as const;

const nullableString = z.string().nullable();

export const visitingCardExtractionSchema = z
  .object({
    schemaVersion: z.literal(VISITING_CARD_EXTRACTION_SCHEMA_VERSION),
    businessName: nullableString,
    phone: nullableString,
    address: nullableString,
    city: nullableString,
    state: nullableString,
    pincode: nullableString,
    contactPerson: nullableString,
    email: nullableString,
    confidence: z.number().min(0).max(1),
  })
  .strict();

export type VisitingCardExtraction = z.infer<typeof visitingCardExtractionSchema>;

export type ParseVisitingCardExtractionResult =
  | { ok: true; data: VisitingCardExtraction }
  | { ok: false; errors: z.ZodError };

export function parseVisitingCardExtraction(data: unknown): ParseVisitingCardExtractionResult {
  const result = visitingCardExtractionSchema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, errors: result.error };
}

/** Map extraction output to record-visit form field names. */
export function visitingCardExtractionToFormFields(
  extraction: VisitingCardExtraction,
  meta?: { phones?: string[]; fieldConfidence?: Record<string, number> },
) {
  return {
    dealerName: extraction.businessName?.trim() || "",
    phone: (meta?.phones?.[0] ?? extraction.phone)?.trim() || "",
    phones: meta?.phones?.length ? meta.phones : extraction.phone ? [extraction.phone.trim()] : [],
    address: extraction.address?.trim() || "",
    city: extraction.city?.trim() || "",
    state: extraction.state?.trim() || "",
    pincode: extraction.pincode?.trim() || "",
    contactPerson: extraction.contactPerson?.trim() || "",
    email: extraction.email?.trim() || "",
    confidence: extraction.confidence,
    fieldConfidence: meta?.fieldConfidence ?? {},
  };
}
