import { describe, expect, it } from "vitest";
import {
  parseVisitingCardExtraction,
  visitingCardExtractionSchema,
  visitingCardExtractionToFormFields,
  VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
} from "./visiting-card-extraction";

describe("visitingCardExtractionSchema", () => {
  const valid = {
    schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
    businessName: "Sharma Auto",
    phone: "9876543210",
    address: "MG Road",
    city: "Indore",
    state: "Madhya Pradesh",
    pincode: "452001",
    contactPerson: "Rajesh Sharma",
    email: "rajesh@example.com",
    confidence: 0.92,
  };

  it("accepts a complete extraction", () => {
    expect(visitingCardExtractionSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts null fields", () => {
    const result = visitingCardExtractionSchema.safeParse({
      ...valid,
      businessName: null,
      phone: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
      contactPerson: null,
      email: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects wrong schema version", () => {
    const result = visitingCardExtractionSchema.safeParse({
      ...valid,
      schemaVersion: "2",
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside 0..1", () => {
    const result = visitingCardExtractionSchema.safeParse({
      ...valid,
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("parseVisitingCardExtraction", () => {
  it("returns parsed data on success", () => {
    const result = parseVisitingCardExtraction({
      schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
      businessName: "Test Shop",
      phone: null,
      address: null,
      city: "Bhopal",
      state: "MP",
      pincode: null,
      contactPerson: null,
      email: null,
      confidence: 0.8,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.businessName).toBe("Test Shop");
    }
  });
});

describe("visitingCardExtractionToFormFields", () => {
  it("maps extraction to form field names", () => {
    const fields = visitingCardExtractionToFormFields({
      schemaVersion: VISITING_CARD_EXTRACTION_SCHEMA_VERSION,
      businessName: " Sharma Auto ",
      phone: " 1111111111 ",
      address: " MG Road ",
      city: " Indore ",
      state: " MP ",
      pincode: " 452001 ",
      contactPerson: " Rajesh ",
      email: " test@example.com ",
      confidence: 0.9,
    }, {
      phones: ["9876543210", "9822012345"],
    });
    expect(fields).toEqual({
      dealerName: "Sharma Auto",
      phone: "9876543210",
      phones: ["9876543210", "9822012345"],
      address: "MG Road",
      city: "Indore",
      state: "MP",
      pincode: "452001",
      contactPerson: "Rajesh",
      email: "test@example.com",
      confidence: 0.9,
      fieldConfidence: {},
    });
  });
});
