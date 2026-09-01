/**
 * Browser-side visiting card OCR. Runs on the salesman's device so scans are
 * not blocked by Vercel serverless cold starts or function timeouts.
 */

const LANGUAGES = "eng";

export interface ClientOcrResult {
  text: string;
  confidence: number;
}

type TesseractWorker = Awaited<
  ReturnType<typeof import("tesseract.js")["createWorker"]>
>;

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker(LANGUAGES);
    })();
  }
  return workerPromise;
}

/** Reset worker after a fatal OCR error (e.g. corrupt image). */
export async function resetVisitingCardOcrWorker(): Promise<void> {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch {
      // ignore cleanup errors
    }
    workerPromise = null;
  }
}

export type ClientOcrPhase = "loading" | "reading";

/**
 * Run Tesseract OCR on visiting-card images in the browser.
 * First run downloads ~4 MB language data; later scans in the same session are faster.
 */
export async function recognizeVisitingCardClient(
  files: File[],
  onPhase?: (phase: ClientOcrPhase) => void,
): Promise<ClientOcrResult> {
  if (files.length === 0) {
    return { text: "", confidence: 0 };
  }

  onPhase?.("loading");
  const worker = await getWorker();

  onPhase?.("reading");
  const parts: string[] = [];
  const confidences: number[] = [];

  for (const file of files) {
    const result = await worker.recognize(file);
    const text = result.data.text?.trim() ?? "";
    if (text) parts.push(text);
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
}
