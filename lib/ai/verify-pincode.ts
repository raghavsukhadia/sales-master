import "server-only";
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { z } from "zod";

export const PINCODE_OVERRIDE_MIN_CONFIDENCE = 0.75;

const DEFAULT_VISITING_CARD_EXTRACTION_MODEL = "gemini-2.5-flash";

const PINCODE_REGEX = /^\d{6}$/;

export type PincodeVerifyInput = {
  city: string;
  state?: string | null;
  address?: string | null;
  pincodeFromCard?: string | null;
};

export type PincodeVerifyAction = "kept" | "corrected" | "inferred" | "skipped";

export type PincodeVerifyResult = {
  pincode: string | null;
  action: PincodeVerifyAction;
  confidence: number;
  reason?: string;
};

const geminiPincodeVerifyResponseSchema = z
  .object({
    pincode: z.string().nullable(),
    action: z.enum(["kept", "corrected", "inferred"]),
    confidence: z.number().min(0).max(1),
    reason: z.string().optional(),
  })
  .strict();

export const PINCODE_VERIFY_SYSTEM_PROMPT = `You are an Indian postal pincode verification engine.

Given a dealer's city, state, address/locality, and an optional pincode read from a visiting card, determine the correct 6-digit Indian PIN code.

Hard rules:
- Output a single JSON object only. No markdown fences, no commentary.
- Use city + state + address/locality together. City alone is NOT enough to guess a pincode when address is missing.
- pincode: final 6-digit PIN as a string, or null if uncertain.
- action values:
  - "kept": pincodeFromCard is valid 6 digits AND matches the stated locality.
  - "corrected": pincodeFromCard is wrong or partially wrong but you can determine the correct pincode for the locality.
  - "inferred": pincodeFromCard is missing/invalid but you can infer pincode from address + city + state.
- confidence: 0 to 1. Use low confidence (< 0.75) when locality is vague (city only, no address).
- reason: brief explanation (optional).
- Never invent a pincode when uncertain — return pincode null with low confidence.
- Indian pincodes are exactly 6 digits.`;

const PINCODE_VERIFY_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    pincode: { type: SchemaType.STRING, nullable: true },
    action: { type: SchemaType.STRING, format: "enum", enum: ["kept", "corrected", "inferred"] },
    confidence: { type: SchemaType.NUMBER },
    reason: { type: SchemaType.STRING, nullable: true },
  },
  required: ["pincode", "action", "confidence"],
};

function getModel(): string {
  return (
    process.env.VISITING_CARD_EXTRACTION_MODEL?.trim() ||
    DEFAULT_VISITING_CARD_EXTRACTION_MODEL
  );
}

export function isValidIndianPincode(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  const digits = value.replace(/\D/g, "");
  return PINCODE_REGEX.test(digits);
}

export function normalizePincodeDigits(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return PINCODE_REGEX.test(digits) ? digits : null;
}

function buildUserPrompt(input: PincodeVerifyInput): string {
  return [
    "Verify the pincode for this dealer location:",
    JSON.stringify(
      {
        city: input.city.trim(),
        state: input.state?.trim() || null,
        address: input.address?.trim() || null,
        pincodeFromCard:
          normalizePincodeDigits(input.pincodeFromCard) ??
          (input.pincodeFromCard?.trim() || null),
      },
      null,
      2,
    ),
  ].join("\n");
}

function skippedResult(pincodeFromCard: string | null | undefined): PincodeVerifyResult {
  return {
    pincode: normalizePincodeDigits(pincodeFromCard),
    action: "skipped",
    confidence: 0,
  };
}

function keptResult(
  pincodeFromCard: string | null | undefined,
  confidence = 0.5,
): PincodeVerifyResult {
  return {
    pincode: normalizePincodeDigits(pincodeFromCard),
    action: "kept",
    confidence,
  };
}

/** Apply guardrails to raw Gemini pincode verification output. */
export function applyPincodeVerifyGuardrails(
  ai: z.infer<typeof geminiPincodeVerifyResponseSchema>,
  pincodeFromCard: string | null | undefined,
): PincodeVerifyResult {
  const cardPin = normalizePincodeDigits(pincodeFromCard);
  const aiPin = normalizePincodeDigits(ai.pincode);

  if (ai.action === "kept") {
    return {
      pincode: aiPin ?? cardPin,
      action: "kept",
      confidence: ai.confidence,
      reason: ai.reason,
    };
  }

  if (
    (ai.action === "corrected" || ai.action === "inferred") &&
    ai.confidence >= PINCODE_OVERRIDE_MIN_CONFIDENCE &&
    aiPin
  ) {
    return {
      pincode: aiPin,
      action: ai.action,
      confidence: ai.confidence,
      reason: ai.reason,
    };
  }

  return keptResult(cardPin, cardPin ? 0.5 : 0);
}

export async function verifyPincodeWithGemini(
  input: PincodeVerifyInput,
): Promise<PincodeVerifyResult> {
  const city = input.city?.trim();
  if (!city) {
    return skippedResult(input.pincodeFromCard);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return keptResult(input.pincodeFromCard);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getModel(),
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: PINCODE_VERIFY_RESPONSE_SCHEMA,
      },
      systemInstruction: PINCODE_VERIFY_SYSTEM_PROMPT,
    });

    const result = await model.generateContent(buildUserPrompt(input));
    const rawOutput = result.response.text();

    if (!rawOutput?.trim()) {
      return keptResult(input.pincodeFromCard);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      return keptResult(input.pincodeFromCard);
    }

    const parsed = geminiPincodeVerifyResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return keptResult(input.pincodeFromCard);
    }

    return applyPincodeVerifyGuardrails(parsed.data, input.pincodeFromCard);
  } catch {
    return keptResult(input.pincodeFromCard);
  }
}
