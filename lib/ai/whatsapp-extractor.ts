import "server-only";
import OpenAI from "openai";
import type { WhatsAppTranscript } from "@/lib/business/whatsapp-transcript";
import {
  parseWhatsAppExtraction,
  WHATSAPP_EXTRACTION_SCHEMA_VERSION,
  type WhatsAppExtraction,
} from "@/lib/validations/whatsapp-extraction";

export const WHATSAPP_EXTRACTION_PROMPT_VERSION = "v1" as const;

export const DEFAULT_WHATSAPP_EXTRACTION_MODEL = "gpt-4o-mini";

export type ExtractionErrorCategory =
  | "provider"
  | "malformed"
  | "validation"
  | "persistence"
  | "unknown";

export type WhatsAppAiExtractResult =
  | {
      ok: true;
      data: WhatsAppExtraction;
      rawOutput: string;
      model: string;
      promptVersion: typeof WHATSAPP_EXTRACTION_PROMPT_VERSION;
      schemaVersion: typeof WHATSAPP_EXTRACTION_SCHEMA_VERSION;
    }
  | {
      ok: false;
      category: ExtractionErrorCategory;
      message: string;
      rawOutput: string | null;
      validationErrors: unknown | null;
      model: string;
      promptVersion: typeof WHATSAPP_EXTRACTION_PROMPT_VERSION;
      schemaVersion: typeof WHATSAPP_EXTRACTION_SCHEMA_VERSION;
    };

export const WHATSAPP_EXTRACTION_SYSTEM_PROMPT = `You are an extraction engine for field-sales WhatsApp conversations in India (automobile aftermarket / dealer visits).

Your ONLY job is to interpret the conversation into structured JSON matching the schema the user provides.
You do NOT make business decisions. You do NOT invent facts.

Hard rules:
- Output a single JSON object only. No markdown fences, no commentary.
- schemaVersion must be exactly "${WHATSAPP_EXTRACTION_SCHEMA_VERSION}".
- Never invent dealer, visit, follow-up, salesman, or database IDs. Never invent UUIDs.
- Never decide whether a dealer should be created or matched. Leave identity ambiguous when unclear.
- Prefer null over guessed values. Unknown stays unknown.
- Preserve ambiguous human date/time expressions as text (e.g. "kal", "Friday", "tomorrow") in dateText/timeText. Do NOT convert them to ISO calendar dates.
- Conversations may be Hindi, English, Hinglish, abbreviations, spelling mistakes, and informal sales shorthand. Interpret carefully.
- Later messages may correct earlier ones — prefer the latest clear statement when they conflict, and still record an ambiguity entry.
- Outbound/system messages may provide context but must not override clear salesman inbound statements.
- Media entries are METADATA ONLY. You are NOT shown image/audio/document bytes. Do not pretend you read visiting cards, photos, or voice contents unless text/transcription is present in the message text fields.
- If media is attached without text, note it via missingFields/ambiguities rather than inventing contents.
- confidence.overall must be a number from 0 to 1.
- List important gaps in missingFields (e.g. "dealer.phone", "followUp.dateText").
- List conflicts/uncertainties in ambiguities[{field, reason}].
- products is an array; use [] when none are mentioned.
- summary: short neutral summary of what was said.

conversationIntent values:
- visit_report: primarily logging a dealer visit
- follow_up: primarily scheduling/updating a follow-up
- dealer_update: updating dealer details without a clear visit
- mixed: combination
- unknown: cannot tell`;

function getModel(): string {
  return process.env.WHATSAPP_EXTRACTION_MODEL?.trim() || DEFAULT_WHATSAPP_EXTRACTION_MODEL;
}

function buildUserPrompt(transcript: WhatsAppTranscript): string {
  return [
    "Extract structured data from this normalized WhatsApp session transcript.",
    "Remember: media.*.filePath is a storage reference, not content you can read.",
    "",
    "Required JSON shape (types described; fill with real values or null):",
    JSON.stringify(
      {
        schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
        conversationIntent: "visit_report|follow_up|dealer_update|mixed|unknown",
        dealer: {
          name: "string|null",
          phone: "string|null",
          locality: "string|null",
          city: "string|null",
          address: "string|null",
        },
        visit: {
          occurred: "boolean|null",
          dateText: "string|null",
          timeText: "string|null",
          outcome: "string|null",
          notes: "string|null",
        },
        followUp: {
          requested: "boolean|null",
          dateText: "string|null",
          reason: "string|null",
        },
        products: [
          {
            name: "string",
            quantityText: "string|null",
            priceText: "string|null",
            notes: "string|null",
          },
        ],
        summary: "string",
        missingFields: ["string"],
        ambiguities: [{ field: "string", reason: "string" }],
        confidence: { overall: "number 0..1" },
      },
      null,
      2,
    ),
    "",
    "Transcript JSON:",
    JSON.stringify(transcript, null, 2),
  ].join("\n");
}

/**
 * Provider boundary for WhatsApp session extraction.
 * Accepts a normalized transcript; returns validated extraction or typed failure.
 */
export async function extractFromTranscript(
  transcript: WhatsAppTranscript,
): Promise<WhatsAppAiExtractResult> {
  const model = getModel();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      category: "provider",
      message: "OPENAI_API_KEY is not configured",
      rawOutput: null,
      validationErrors: null,
      model,
      promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
      schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
    };
  }

  let rawOutput: string | null = null;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: WHATSAPP_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(transcript) },
      ],
    });

    rawOutput = completion.choices[0]?.message?.content ?? null;
    if (!rawOutput) {
      return {
        ok: false,
        category: "provider",
        message: "Model returned empty content",
        rawOutput: null,
        validationErrors: null,
        model,
        promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
        schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawOutput);
    } catch {
      return {
        ok: false,
        category: "malformed",
        message: "Model response was not valid JSON",
        rawOutput,
        validationErrors: null,
        model,
        promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
        schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
      };
    }

    const validated = parseWhatsAppExtraction(parsedJson);
    if (!validated.ok) {
      return {
        ok: false,
        category: "validation",
        message: "Model JSON failed Zod validation",
        rawOutput,
        validationErrors: validated.errors.flatten(),
        model,
        promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
        schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
      };
    }

    return {
      ok: true,
      data: validated.data,
      rawOutput,
      model,
      promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
      schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown provider error";
    return {
      ok: false,
      category: "provider",
      message,
      rawOutput,
      validationErrors: null,
      model,
      promptVersion: WHATSAPP_EXTRACTION_PROMPT_VERSION,
      schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
    };
  }
}
