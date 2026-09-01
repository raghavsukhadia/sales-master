import { describe, expect, it, vi, beforeEach } from "vitest";
import { VISITING_CARD_EXTRACTION_SCHEMA_VERSION } from "@/lib/validations/visiting-card-extraction";

vi.mock("server-only", () => ({}));

const mockRecognize = vi.fn();

vi.mock("@/lib/ocr/tesseract", () => ({
  recognizeVisitingCardText: (...args: unknown[]) => mockRecognize(...args),
}));

describe("extractFromVisitingCardImages", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRecognize.mockReset();
  });

  it("returns validation error when no images provided", async () => {
    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("1 or 2");
    }
  });

  it("maps OCR text into structured extraction", async () => {
    mockRecognize.mockResolvedValue({
      text: `Car Editing & Detailing
Shop No. 15, MIDB School Complex, Near Naka Petrol Pump, Wardhaman Nagar, Nagpur-08
Mob: 9876543210`,
      confidence: 0.82,
    });

    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([
      { mimeType: "image/jpeg", base64: Buffer.from("fake").toString("base64") },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schemaVersion).toBe(VISITING_CARD_EXTRACTION_SCHEMA_VERSION);
      expect(result.data.businessName).toBe("Car Editing & Detailing");
      expect(result.data.phone).toBe("9876543210");
      expect(result.model).toBe("tesseract-ocr");
    }
  });

  it("returns error when OCR finds no text", async () => {
    mockRecognize.mockResolvedValue({ text: "   ", confidence: 0 });

    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([
      { mimeType: "image/jpeg", base64: Buffer.from("fake").toString("base64") },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Could not read any text");
    }
  });
});
