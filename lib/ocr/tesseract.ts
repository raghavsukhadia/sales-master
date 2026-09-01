import "server-only";
import { createWorker, type Worker } from "tesseract.js";

const LANGUAGES = "eng";

export interface OcrRecognitionResult {
  text: string;
  confidence: number;
}

async function withWorker<T>(fn: (worker: Worker) => Promise<T>): Promise<T> {
  const worker = await createWorker(LANGUAGES);
  try {
    return await fn(worker);
  } finally {
    await worker.terminate();
  }
}

/**
 * Run Tesseract OCR on one or more visiting-card image buffers.
 * Concatenates multi-image text with a separator for the parser.
 */
export async function recognizeVisitingCardText(
  images: Buffer[],
): Promise<OcrRecognitionResult> {
  if (images.length === 0) {
    return { text: "", confidence: 0 };
  }

  return withWorker(async (worker) => {
    const parts: string[] = [];
    const confidences: number[] = [];

    for (const image of images) {
      const result = await worker.recognize(image);
      const text = result.data.text?.trim() ?? "";
      if (text) {
        parts.push(text);
      }
      if (typeof result.data.confidence === "number" && result.data.confidence > 0) {
        confidences.push(result.data.confidence / 100);
      }
    }

    const text = parts.join("\n---\n");
    const confidence =
      confidences.length > 0
        ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
        : 0;

    return { text, confidence };
  });
}
