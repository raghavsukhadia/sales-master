import "server-only";
import { extractWithGemini } from "@/lib/ai/gemini-visiting-card-extractor";
import type { VisitingCardImageInput } from "@/lib/ai/gemini-visiting-card-extractor";
import {
  VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
  type VisitingCardExtraction,
} from "@/lib/validations/visiting-card-extraction";
import type { VisitingCardFieldConfidence } from "@/lib/business/visiting-card-parser";

export const VISITING_CARD_EXTRACTION_METHOD = "gemini-vision" as const;
export const VISITING_CARD_EXTRACTION_PROMPT_VERSION = "gemini-v1" as const;

export type { VisitingCardImageInput } from "@/lib/ai/gemini-visiting-card-extractor";

export type VisitingCardExtractResult =
  | {
      ok: true;
      data: VisitingCardExtraction;
      phones: string[];
      fieldConfidence: VisitingCardFieldConfidence;
      rawOutput: string;
      model: string;
      promptVersion: typeof VISITING_CARD_EXTRACTION_PROMPT_VERSION;
      schemaVersion: typeof VISITING_CARD_EXTRACTION_SCHEMA_VERSION;
    }
  | {
      ok: false;
      message: string;
      rawOutput: string | null;
      model: string;
      promptVersion: typeof VISITING_CARD_EXTRACTION_PROMPT_VERSION;
      schemaVersion: typeof VISITING_CARD_EXTRACTION_SCHEMA_VERSION;
    };

export async function extractFromVisitingCardImages(
  images: VisitingCardImageInput[],
): Promise<VisitingCardExtractResult> {
  const promptVersion = VISITING_CARD_EXTRACTION_PROMPT_VERSION;
  const schemaVersion = VISITING_CARD_EXTRACTION_SCHEMA_VERSION;

  if (images.length === 0 || images.length > 2) {
    return {
      ok: false,
      message: "Provide 1 or 2 visiting card images",
      rawOutput: null,
      model: VISITING_CARD_EXTRACTION_METHOD,
      promptVersion,
      schemaVersion,
    };
  }

  const result = await extractWithGemini(images);

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      rawOutput: result.rawOutput,
      model: result.model,
      promptVersion,
      schemaVersion,
    };
  }

  return {
    ok: true,
    data: result.data,
    phones: result.phones,
    fieldConfidence: result.fieldConfidence,
    rawOutput: result.rawOutput,
    model: result.model,
    promptVersion,
    schemaVersion,
  };
}
