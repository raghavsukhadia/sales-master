import { describe, expect, it } from "vitest";
import {
  parseWhatsAppExtraction,
  WHATSAPP_EXTRACTION_SCHEMA_VERSION,
  whatsappExtractionSchema,
} from "./whatsapp-extraction";

const validBase = {
  schemaVersion: WHATSAPP_EXTRACTION_SCHEMA_VERSION,
  conversationIntent: "visit_report" as const,
  dealer: {
    name: "Sharma Auto",
    phone: "9876543210",
    locality: null,
    city: "Indore",
    address: null,
  },
  visit: {
    occurred: true,
    dateText: "aaj",
    timeText: null,
    outcome: "interested",
    notes: "PPF discuss kiya",
  },
  followUp: {
    requested: true,
    dateText: "Friday",
    reason: "Send quotation",
  },
  products: [
    {
      name: "PPF",
      quantityText: null,
      priceText: null,
      notes: "high interest",
    },
  ],
  summary: "Visited Sharma Auto in Indore; interested in PPF; follow up Friday.",
  missingFields: [],
  ambiguities: [],
  confidence: { overall: 0.82 },
};

describe("whatsappExtractionSchema", () => {
  it("accepts a valid visit report", () => {
    const result = whatsappExtractionSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts incomplete reports with nulls and unknown intent", () => {
    const result = parseWhatsAppExtraction({
      ...validBase,
      conversationIntent: "unknown",
      dealer: {
        name: null,
        phone: null,
        locality: null,
        city: null,
        address: null,
      },
      visit: {
        occurred: null,
        dateText: null,
        timeText: null,
        outcome: null,
        notes: null,
      },
      followUp: {
        requested: null,
        dateText: null,
        reason: null,
      },
      products: [],
      missingFields: ["dealer.name", "visit.occurred"],
      ambiguities: [{ field: "dealer.name", reason: "Not stated clearly" }],
      confidence: { overall: 0.2 },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects confidence outside 0..1", () => {
    const result = whatsappExtractionSchema.safeParse({
      ...validBase,
      confidence: { overall: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed products", () => {
    const result = whatsappExtractionSchema.safeParse({
      ...validBase,
      products: [{ name: "", quantityText: null, priceText: null, notes: null }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects unexpected authoritative ID fields via strict objects", () => {
    const result = whatsappExtractionSchema.safeParse({
      ...validBase,
      dealer: {
        ...validBase.dealer,
        dealerId: "00000000-0000-0000-0000-000000000001",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    const result = whatsappExtractionSchema.safeParse({
      ...validBase,
      schemaVersion: "2",
    });
    expect(result.success).toBe(false);
  });
});
