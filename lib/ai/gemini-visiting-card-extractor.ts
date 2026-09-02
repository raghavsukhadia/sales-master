import "server-only";
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import type { VisitingCardFieldConfidence } from "@/lib/business/visiting-card-parser";
import { normalizeIndianMobile } from "@/lib/utils/phone";
import {
  parseVisitingCardExtraction,
  VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
  type VisitingCardExtraction,
} from "@/lib/validations/visiting-card-extraction";
import { verifyPincodeWithGemini } from "@/lib/ai/verify-pincode";
import { z } from "zod";

export type VisitingCardImageInput = {
  mimeType: string;
  base64: string;
};

export const DEFAULT_VISITING_CARD_EXTRACTION_MODEL = "gemini-2.5-flash";

const nullableString = z.string().nullable();

const geminiVisitingCardResponseSchema = z
  .object({
    schemaVersion: z.literal(VISITING_CARD_EXTRACTION_SCHEMA_VERSION),
    businessName: nullableString,
    phone: nullableString,
    phones: z.array(z.string()).optional(),
    address: nullableString,
    city: nullableString,
    state: nullableString,
    pincode: nullableString,
    contactPerson: nullableString,
    email: nullableString,
    confidence: z.number().min(0).max(1),
    fieldConfidence: z
      .object({
        businessName: z.number().min(0).max(1),
        phone: z.number().min(0).max(1),
        address: z.number().min(0).max(1),
        city: z.number().min(0).max(1),
        state: z.number().min(0).max(1),
        pincode: z.number().min(0).max(1),
      })
      .optional(),
  })
  .strict();

type GeminiVisitingCardResponse = z.infer<typeof geminiVisitingCardResponseSchema>;

export const GEMINI_VISITING_CARD_SYSTEM_PROMPT = `You are a visiting-card extraction engine for field sales in India (automobile aftermarket / dealer visits).

Your ONLY job is to read visiting-card image(s) and output structured JSON.
You do NOT make business decisions. You do NOT invent facts.

Hard rules:
- Output a single JSON object only. No markdown fences, no commentary.
- schemaVersion must be exactly "${VISITING_CARD_EXTRACTION_SCHEMA_VERSION}".
- Cards may be Hindi, English, Hinglish, or mixed. Read all scripts on the card.
- Prefer null over guessed values. Unknown stays unknown.
- businessName: shop/dealer/company name (not a person's name unless that IS the business).
- contactPerson: owner/manager/contact name when clearly labeled or obvious.
- phone: primary mobile number as 10 digits (no country code).
- phones: all distinct Indian mobile numbers found (10 digits each).
- address: full postal address line(s) excluding city/state/pincode when those are separate.
- city: city or town name.
- state: full Indian state/UT name (e.g. "Madhya Pradesh", not "MP").
- pincode: 6-digit Indian PIN exactly as printed on the card (do not guess from city — pincode is verified separately).
- email: email address when visible.
- confidence: overall extraction confidence from 0 to 1.
- fieldConfidence: per-field confidence (0–1) for businessName, phone, address, city, state, pincode.
- Strip decorative text, slogans, and taglines from businessName when a clear shop name exists.
- Do not include landline STD codes as mobile numbers unless no mobile is present.`;

const GEMINI_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    schemaVersion: { type: SchemaType.STRING },
    businessName: { type: SchemaType.STRING, nullable: true },
    phone: { type: SchemaType.STRING, nullable: true },
    phones: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    address: { type: SchemaType.STRING, nullable: true },
    city: { type: SchemaType.STRING, nullable: true },
    state: { type: SchemaType.STRING, nullable: true },
    pincode: { type: SchemaType.STRING, nullable: true },
    contactPerson: { type: SchemaType.STRING, nullable: true },
    email: { type: SchemaType.STRING, nullable: true },
    confidence: { type: SchemaType.NUMBER },
    fieldConfidence: {
      type: SchemaType.OBJECT,
      properties: {
        businessName: { type: SchemaType.NUMBER },
        phone: { type: SchemaType.NUMBER },
        address: { type: SchemaType.NUMBER },
        city: { type: SchemaType.NUMBER },
        state: { type: SchemaType.NUMBER },
        pincode: { type: SchemaType.NUMBER },
      },
    },
  },
  required: [
    "schemaVersion",
    "businessName",
    "phone",
    "address",
    "city",
    "state",
    "pincode",
    "contactPerson",
    "email",
    "confidence",
  ],
};

function getModel(): string {
  return (
    process.env.VISITING_CARD_EXTRACTION_MODEL?.trim() ||
    DEFAULT_VISITING_CARD_EXTRACTION_MODEL
  );
}

function emptyToNull(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normalize phone strings to 10-digit local mobile numbers (deduped). */
export function normalizePhonesFromGemini(
  phone: string | null | undefined,
  phones: string[] | undefined,
): string[] {
  const candidates = [...(phones ?? []), ...(phone ? [phone] : [])];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of candidates) {
    const normalized = normalizeIndianMobile(raw);
    if (!normalized) continue;
    const local = normalized.slice(2);
    if (!seen.has(local)) {
      seen.add(local);
      result.push(local);
    }
  }

  return result;
}

function clampConfidence(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function buildFieldConfidence(
  response: GeminiVisitingCardResponse,
  phones: string[],
): VisitingCardFieldConfidence {
  const overall = response.confidence;
  const fc = response.fieldConfidence;

  const forField = (
    key: keyof VisitingCardFieldConfidence,
    hasValue: boolean,
  ): number => {
    if (!hasValue) return 0;
    return clampConfidence(fc?.[key], overall);
  };

  return {
    businessName: forField("businessName", Boolean(response.businessName?.trim())),
    phone: forField("phone", phones.length > 0),
    address: forField("address", Boolean(response.address?.trim())),
    city: forField("city", Boolean(response.city?.trim())),
    state: forField("state", Boolean(response.state?.trim())),
    pincode: forField("pincode", Boolean(response.pincode?.trim())),
  };
}

function mapGeminiResponse(response: GeminiVisitingCardResponse): {
  extraction: VisitingCardExtraction;
  phones: string[];
  fieldConfidence: VisitingCardFieldConfidence;
} {
  const phones = normalizePhonesFromGemini(response.phone, response.phones);
  const primaryPhone = phones[0] ?? null;

  const partial = {
    schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
    businessName: emptyToNull(response.businessName),
    phone: primaryPhone,
    address: emptyToNull(response.address),
    city: emptyToNull(response.city),
    state: emptyToNull(response.state),
    pincode: emptyToNull(response.pincode),
    contactPerson: emptyToNull(response.contactPerson),
    email: emptyToNull(response.email),
    confidence: response.confidence,
  };

  const validated = parseVisitingCardExtraction(partial);
  if (!validated.ok) {
    throw new Error("Gemini response failed Zod validation");
  }

  return {
    extraction: validated.data,
    phones,
    fieldConfidence: buildFieldConfidence(response, phones),
  };
}

function hasExtractedContent(extraction: VisitingCardExtraction, phones: string[]): boolean {
  return (
    phones.length > 0 ||
    Boolean(
      extraction.businessName ||
        extraction.address ||
        extraction.city ||
        extraction.email ||
        extraction.contactPerson,
    )
  );
}

async function applyPincodeVerification(mapped: {
  extraction: VisitingCardExtraction;
  fieldConfidence: VisitingCardFieldConfidence;
}): Promise<void> {
  const city = mapped.extraction.city?.trim();
  if (!city) return;

  const verified = await verifyPincodeWithGemini({
    city,
    state: mapped.extraction.state,
    address: mapped.extraction.address,
    pincodeFromCard: mapped.extraction.pincode,
  });

  if (
    verified.pincode &&
    (verified.action === "corrected" || verified.action === "inferred")
  ) {
    mapped.extraction.pincode = verified.pincode;
    mapped.fieldConfidence.pincode = verified.confidence;
  }
}

export type GeminiVisitingCardExtractResult =
  | {
      ok: true;
      data: VisitingCardExtraction;
      phones: string[];
      fieldConfidence: VisitingCardFieldConfidence;
      rawOutput: string;
      model: string;
    }
  | {
      ok: false;
      message: string;
      rawOutput: string | null;
      model: string;
    };

export async function extractWithGemini(
  images: VisitingCardImageInput[],
): Promise<GeminiVisitingCardExtractResult> {
  const modelName = getModel();
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      message: "GEMINI_API_KEY is not configured",
      rawOutput: null,
      model: modelName,
    };
  }

  let rawOutput: string | null = null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
      systemInstruction: GEMINI_VISITING_CARD_SYSTEM_PROMPT,
    });

    const imageParts = images.map((image) => ({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    }));

    const userText =
      images.length > 1
        ? "Extract dealer details from these visiting card images (front/back or multiple angles). Merge information from all images."
        : "Extract dealer details from this visiting card image.";

    const result = await model.generateContent([userText, ...imageParts]);
    rawOutput = result.response.text();

    if (!rawOutput?.trim()) {
      return {
        ok: false,
        message: "Model returned empty content",
        rawOutput: null,
        model: modelName,
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      return {
        ok: false,
        message: "Model response was not valid JSON",
        rawOutput,
        model: modelName,
      };
    }

    const parsed = geminiVisitingCardResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Model JSON failed validation",
        rawOutput,
        model: modelName,
      };
    }

    const mapped = mapGeminiResponse(parsed.data);

    if (!hasExtractedContent(mapped.extraction, mapped.phones)) {
      return {
        ok: false,
        message: "Could not read any text from the card image.",
        rawOutput,
        model: modelName,
      };
    }

    await applyPincodeVerification(mapped);

    return {
      ok: true,
      data: mapped.extraction,
      phones: mapped.phones,
      fieldConfidence: mapped.fieldConfidence,
      rawOutput,
      model: modelName,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Gemini provider error";
    return {
      ok: false,
      message,
      rawOutput,
      model: modelName,
    };
  }
}
