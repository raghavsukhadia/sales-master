import { describe, expect, it } from "vitest";
import {
  calculateOrderTotal,
  normalizeOrderLines,
  parseRecordVisitPayload,
  recordVisitSchema,
} from "./record-visit";

const productId = "550e8400-e29b-41d4-a716-446655440000";

describe("recordVisitSchema", () => {
  const validNewPayload = {
    dealerMode: "new" as const,
    dealerName: "Sharma Auto",
    phone: "9876543210",
    address: "MG Road",
    city: "Indore",
    state: "MP",
    pincode: "452001",
    hasOrder: true,
    orderLines: [
      { productId, productName: "PPF", quantity: 2, unitPrice: 0, unit: "pcs" as const },
    ],
  };

  const validExistingPayload = {
    dealerMode: "existing" as const,
    dealerId: "550e8400-e29b-41d4-a716-446655440001",
    hasOrder: true,
    orderLines: [
      { productId, productName: "PPF", quantity: 1, unitPrice: 0, unit: "pcs" as const },
    ],
  };

  it("accepts a valid new-dealer payload with order lines", () => {
    const result = recordVisitSchema.safeParse(validNewPayload);
    expect(result.success).toBe(true);
  });

  it("accepts a valid existing-dealer payload", () => {
    const result = recordVisitSchema.safeParse(validExistingPayload);
    expect(result.success).toBe(true);
  });

  it("accepts no order with empty order lines", () => {
    const result = recordVisitSchema.safeParse({
      ...validNewPayload,
      hasOrder: false,
      orderLines: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects hasOrder false with order lines", () => {
    const result = recordVisitSchema.safeParse(validNewPayload);
    expect(result.success).toBe(true);
    const bad = recordVisitSchema.safeParse({
      ...validNewPayload,
      hasOrder: false,
      orderLines: validNewPayload.orderLines,
    });
    expect(bad.success).toBe(false);
  });

  it("rejects hasOrder true with empty order lines", () => {
    const result = recordVisitSchema.safeParse({
      ...validNewPayload,
      hasOrder: true,
      orderLines: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing dealer name for new dealer", () => {
    const result = recordVisitSchema.safeParse({ ...validNewPayload, dealerName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects short phone for new dealer", () => {
    const result = recordVisitSchema.safeParse({ ...validNewPayload, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid Indian mobile numbers", () => {
    expect(recordVisitSchema.safeParse({ ...validNewPayload, phone: "5876543210" }).success).toBe(
      false,
    );
  });

  it("rejects missing address for new dealer", () => {
    const result = recordVisitSchema.safeParse({ ...validNewPayload, address: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing city for new dealer", () => {
    const result = recordVisitSchema.safeParse({ ...validNewPayload, city: "" });
    expect(result.success).toBe(false);
  });

  it("rejects zero quantity", () => {
    const result = recordVisitSchema.safeParse({
      ...validNewPayload,
      orderLines: [{ productId, productName: "PPF", quantity: 0, unitPrice: 0, unit: "pcs" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate catalog products", () => {
    const result = recordVisitSchema.safeParse({
      ...validNewPayload,
      orderLines: [
        { productId, productName: "PPF", quantity: 2, unitPrice: 0, unit: "pcs" },
        { productId, productName: "PPF", quantity: 3, unitPrice: 0, unit: "pcs" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid dealer id for existing mode", () => {
    const result = recordVisitSchema.safeParse({
      ...validExistingPayload,
      dealerId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("defaults nextAction to none when omitted", () => {
    const result = recordVisitSchema.safeParse(validNewPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextAction.type).toBe("none");
    }
  });

  it("accepts call_dealer next action with due date on order visit", () => {
    const result = recordVisitSchema.safeParse({
      ...validExistingPayload,
      nextAction: { type: "call_dealer", dueDate: "2099-01-15" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts next action on no-order visit", () => {
    const result = recordVisitSchema.safeParse({
      ...validNewPayload,
      hasOrder: false,
      orderLines: [],
      nextAction: { type: "send_quotation", dueDate: "2099-01-15" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects next action without due date", () => {
    const result = recordVisitSchema.safeParse({
      ...validExistingPayload,
      nextAction: { type: "call_dealer" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects past due date on next action", () => {
    const result = recordVisitSchema.safeParse({
      ...validExistingPayload,
      nextAction: { type: "call_dealer", dueDate: "2020-01-01" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects other without custom description", () => {
    const result = recordVisitSchema.safeParse({
      ...validExistingPayload,
      nextAction: { type: "other", dueDate: "2099-01-15" },
    });
    expect(result.success).toBe(false);
  });
});

describe("calculateOrderTotal", () => {
  it("sums unit price times quantity", () => {
    expect(
      calculateOrderTotal([
        { unitPrice: 1000, quantity: 2 },
        { unitPrice: 500, quantity: 1 },
      ]),
    ).toBe(2500);
  });

  it("defaults missing unit price to zero", () => {
    expect(calculateOrderTotal([{ unitPrice: 0, quantity: 3 }])).toBe(0);
  });
});

describe("normalizeOrderLines", () => {
  it("drops fully empty rows", () => {
    expect(
      normalizeOrderLines([
        { productId: null, productName: "", quantity: "" },
        { productId, productName: "PPF", quantity: "2" },
      ]),
    ).toEqual([
      { productId, productName: "PPF", quantity: 2, unitPrice: 0, unit: "pcs" },
    ]);
  });

  it("keeps partial rows for validation to catch", () => {
    const rows = normalizeOrderLines([{ productId: null, productName: "PPF", quantity: "" }]);
    expect(rows).toHaveLength(1);
    expect(Number.isNaN(rows[0].quantity)).toBe(true);
  });
});

describe("parseRecordVisitPayload", () => {
  it("parses valid new-dealer input with no order", () => {
    const parsed = parseRecordVisitPayload({
      dealerMode: "new",
      dealerName: "Test Dealer",
      phone: "9876543210",
      address: "MG Road",
      city: "Indore",
      hasOrder: false,
      orderLines: [],
    });
    expect(parsed.dealerMode).toBe("new");
    if (parsed.dealerMode === "new") {
      expect(parsed.dealerName).toBe("Test Dealer");
    }
  });
});
