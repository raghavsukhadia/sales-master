import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockGenerateContent } = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
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
  },
}));

function geminiJsonResponse(data: unknown) {
  return {
    response: {
      text: () => JSON.stringify(data),
    },
  };
}

describe("applyPincodeVerifyGuardrails", () => {
  it("keeps valid matching pincode", async () => {
    const { applyPincodeVerifyGuardrails } = await import("./verify-pincode");
    const result = applyPincodeVerifyGuardrails(
      {
        pincode: "440008",
        action: "kept",
        confidence: 0.9,
      },
      "440008",
    );
    expect(result.action).toBe("kept");
    expect(result.pincode).toBe("440008");
  });

  it("corrects wrong pincode when confidence is high", async () => {
    const { applyPincodeVerifyGuardrails } = await import("./verify-pincode");
    const result = applyPincodeVerifyGuardrails(
      {
        pincode: "440008",
        action: "corrected",
        confidence: 0.88,
        reason: "Wardhaman Nagar uses 440008",
      },
      "440018",
    );
    expect(result.action).toBe("corrected");
    expect(result.pincode).toBe("440008");
    expect(result.confidence).toBe(0.88);
  });

  it("does not override when confidence is below threshold", async () => {
    const { applyPincodeVerifyGuardrails } = await import("./verify-pincode");
    const result = applyPincodeVerifyGuardrails(
      {
        pincode: "440008",
        action: "corrected",
        confidence: 0.6,
      },
      "440018",
    );
    expect(result.action).toBe("kept");
    expect(result.pincode).toBe("440018");
  });

  it("rejects invalid pincode format from AI", async () => {
    const { applyPincodeVerifyGuardrails } = await import("./verify-pincode");
    const result = applyPincodeVerifyGuardrails(
      {
        pincode: "44008",
        action: "inferred",
        confidence: 0.95,
      },
      null,
    );
    expect(result.action).toBe("kept");
    expect(result.pincode).toBeNull();
  });
});

describe("isValidIndianPincode", () => {
  it("validates 6-digit pincodes", async () => {
    const { isValidIndianPincode } = await import("./verify-pincode");
    expect(isValidIndianPincode("440008")).toBe(true);
    expect(isValidIndianPincode("440 008")).toBe(true);
    expect(isValidIndianPincode("44008")).toBe(false);
    expect(isValidIndianPincode(null)).toBe(false);
  });
});

describe("verifyPincodeWithGemini", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it("skips when city is missing", async () => {
    const { verifyPincodeWithGemini } = await import("./verify-pincode");
    const result = await verifyPincodeWithGemini({
      city: "",
      pincodeFromCard: "440008",
    });
    expect(result.action).toBe("skipped");
    expect(result.pincode).toBe("440008");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("calls Gemini and corrects wrong Nagpur pincode", async () => {
    mockGenerateContent.mockResolvedValue(
      geminiJsonResponse({
        pincode: "440008",
        action: "corrected",
        confidence: 0.9,
        reason: "Wardhaman Nagar, Nagpur",
      }),
    );

    const { verifyPincodeWithGemini } = await import("./verify-pincode");
    const result = await verifyPincodeWithGemini({
      city: "Nagpur",
      state: "Maharashtra",
      address: "Shop No. 15, Wardhaman Nagar",
      pincodeFromCard: "440018",
    });

    expect(mockGenerateContent).toHaveBeenCalledOnce();
    expect(result.action).toBe("corrected");
    expect(result.pincode).toBe("440008");
  });

  it("keeps card pincode on Gemini failure", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API error"));

    const { verifyPincodeWithGemini } = await import("./verify-pincode");
    const result = await verifyPincodeWithGemini({
      city: "Nagpur",
      state: "Maharashtra",
      address: "Wardhaman Nagar",
      pincodeFromCard: "440018",
    });

    expect(result.action).toBe("kept");
    expect(result.pincode).toBe("440018");
  });
});
