import "server-only";
import { parseVisitingCardTextWithMeta } from "@/lib/business/visiting-card-parser";
import { recognizeVisitingCardText } from "@/lib/ocr/tesseract";
import {
  VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
  type VisitingCardExtraction,
} from "@/lib/validations/visiting-card-extraction";
import type { VisitingCardFieldConfidence } from "@/lib/business/visiting-card-parser";

export const VISITING_CARD_EXTRACTION_METHOD = "tesseract-ocr" as const;
export const VISITING_CARD_EXTRACTION_PROMPT_VERSION = "ocr-v1" as const;

export type VisitingCardImageInput = {
  mimeType: string;
  base64: string;
};

export type VisitingCardExtractResult =
  | {
      ok: true;
      data: VisitingCardExtraction;
      phones: string[];
      fieldConfidence: VisitingCardFieldConfidence;
      rawOutput: string;
      model: typeof VISITING_CARD_EXTRACTION_METHOD;
      promptVersion: typeof VISITING_CARD_EXTRACTION_PROMPT_VERSION;
      schemaVersion: typeof VISITING_CARD_EXTRACTION_SCHEMA_VERSION;
    }
  | {
      ok: false;
      message: string;
      rawOutput: string | null;
      model: typeof VISITING_CARD_EXTRACTION_METHOD;
      promptVersion: typeof VISITING_CARD_EXTRACTION_PROMPT_VERSION;
      schemaVersion: typeof VISITING_CARD_EXTRACTION_SCHEMA_VERSION;
    };

export async function extractFromVisitingCardImages(
  images: VisitingCardImageInput[],
): Promise<VisitingCardExtractResult> {
  const model = VISITING_CARD_EXTRACTION_METHOD;

  if (images.length === 0 || images.length > 2) {
    return {
      ok: false,
      message: "Provide 1 or 2 visiting card images",
      rawOutput: null,
      model,
      promptVersion: VISITING_CARD_EXTRACTION_PROMPT_VERSION,
      schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
    };
  }

  try {
    const buffers = images.map((image) => Buffer.from(image.base64, "base64"));
    const { text, confidence } = await recognizeVisitingCardText(buffers);

    if (!text.trim()) {
      return {
        ok: false,
        message: "Could not read any text from the card image.",
        rawOutput: text,
        model,
        promptVersion: VISITING_CARD_EXTRACTION_PROMPT_VERSION,
        schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
      };
    }

    const parsed = parseVisitingCardTextWithMeta(text, confidence);

    return {
      ok: true,
      data: parsed.extraction,
      phones: parsed.phones,
      fieldConfidence: parsed.fieldConfidence,
      rawOutput: text,
      model,
      promptVersion: VISITING_CARD_EXTRACTION_PROMPT_VERSION,
      schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR failed";
    return {
      ok: false,
      message,
      rawOutput: null,
      model,
      promptVersion: VISITING_CARD_EXTRACTION_PROMPT_VERSION,
      schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
    };
  }
}
