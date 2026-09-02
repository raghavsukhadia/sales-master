import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { VISITING_CARD_EXTRACTION_SCHEMA_VERSION } from "@/lib/validations/visiting-card-extraction";

vi.mock("server-only", () => ({}));

const { mockGenerateContent, mockVerifyPincode } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockVerifyPincode: vi.fn(),
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mockGenerateContent };
    }
  },
  SchemaType: {
    OBJECT: "OBJECT",
    STRING: "STRING",
    NUMBER: "NUMBER",
    ARRAY: "ARRAY",
  },
}));

vi.mock("./verify-pincode", () => ({
  verifyPincodeWithGemini: (...args: unknown[]) => mockVerifyPincode(...args),
}));

function geminiJsonResponse(data: unknown) {
  return {
    response: {
      text: () => JSON.stringify(data),
    },
  };
}

const visionExtraction = {
  schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
  businessName: "Car Editing & Detailing",
  phone: "9876543210",
  phones: ["9876543210"],
  address: "Shop No. 15, Wardhaman Nagar",
  city: "Nagpur",
  state: "Maharashtra",
  pincode: "440018",
  contactPerson: null,
  email: null,
  confidence: 0.92,
  fieldConfidence: {
    businessName: 0.95,
    phone: 0.9,
    address: 0.88,
    city: 0.9,
    state: 0.85,
    pincode: 0.7,
  },
};

describe("extractFromVisitingCardImages", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    mockGenerateContent.mockReset();
    mockVerifyPincode.mockReset();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    mockVerifyPincode.mockResolvedValue({
      pincode: "440008",
      action: "corrected",
      confidence: 0.88,
    });
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it("returns validation error when no images provided", async () => {
    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("1 or 2");
    }
  });

  it("returns error when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([
      { mimeType: "image/jpeg", base64: Buffer.from("fake").toString("base64") },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("GEMINI_API_KEY");
    }
  });

  it("maps Gemini JSON into structured extraction", async () => {
    mockGenerateContent.mockResolvedValue(geminiJsonResponse(visionExtraction));

    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([
      { mimeType: "image/jpeg", base64: Buffer.from("fake").toString("base64") },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.schemaVersion).toBe(VISITING_CARD_EXTRACTION_SCHEMA_VERSION);
      expect(result.data.businessName).toBe("Car Editing & Detailing");
      expect(result.data.phone).toBe("9876543210");
      expect(result.phones).toEqual(["9876543210"]);
      expect(result.model).toBe("gemini-2.5-flash");
      expect(result.promptVersion).toBe("gemini-v1");
    }
  });

  it("applies pincode correction from verify step", async () => {
    mockGenerateContent.mockResolvedValue(geminiJsonResponse(visionExtraction));

    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([
      { mimeType: "image/jpeg", base64: Buffer.from("fake").toString("base64") },
    ]);

    expect(mockVerifyPincode).toHaveBeenCalledWith({
      city: "Nagpur",
      state: "Maharashtra",
      address: "Shop No. 15, Wardhaman Nagar",
      pincodeFromCard: "440018",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.pincode).toBe("440008");
      expect(result.fieldConfidence.pincode).toBe(0.88);
    }
  });

  it("normalizes +91 prefixed phones to 10-digit local numbers", async () => {
    mockGenerateContent.mockResolvedValue(
      geminiJsonResponse({
        schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
        businessName: "Sharma Auto",
        phone: "+91 9876543210",
        phones: ["+919876543210"],
        address: null,
        city: "Indore",
        state: "Madhya Pradesh",
        pincode: null,
        contactPerson: null,
        email: null,
        confidence: 0.85,
      }),
    );
    mockVerifyPincode.mockResolvedValue({
      pincode: null,
      action: "skipped",
      confidence: 0,
    });

    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([
      { mimeType: "image/jpeg", base64: Buffer.from("fake").toString("base64") },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.phones).toEqual(["9876543210"]);
      expect(result.data.phone).toBe("9876543210");
    }
  });

  it("returns error when Gemini response is not valid JSON", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "not json" },
    });

    const { extractFromVisitingCardImages } = await import("./visiting-card-extractor");
    const result = await extractFromVisitingCardImages([
      { mimeType: "image/jpeg", base64: Buffer.from("fake").toString("base64") },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("not valid JSON");
    }
  });

  it("returns error when no content is extracted", async () => {
    mockGenerateContent.mockResolvedValue(
      geminiJsonResponse({
        schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
        businessName: null,
        phone: null,
        phones: [],
        address: null,
        city: null,
        state: null,
        pincode: null,
        contactPerson: null,
        email: null,
        confidence: 0.1,
      }),
    );

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

describe("normalizePhonesFromGemini", () => {
  it("dedupes and normalizes phones", async () => {
    const { normalizePhonesFromGemini } = await import("./gemini-visiting-card-extractor");
    expect(normalizePhonesFromGemini("9876543210", ["919876543210", "9123456789"])).toEqual([
      "9876543210",
      "9123456789",
    ]);
  });
});
