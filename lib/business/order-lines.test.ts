import { describe, expect, it } from "vitest";
import {
  buildOrderSummary,
  canSubmitOrderStep,
  findDuplicateCatalogProduct,
  findDuplicateCustomName,
} from "./order-lines";

describe("findDuplicateCatalogProduct", () => {
  it("returns duplicate product id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(
      findDuplicateCatalogProduct([
        { productId: id, productName: "PPF", quantity: 2 },
        { productId: id, productName: "PPF", quantity: 1 },
      ]),
    ).toBe(id);
  });

  it("returns null when all catalog products are unique", () => {
    expect(
      findDuplicateCatalogProduct([
        { productId: "550e8400-e29b-41d4-a716-446655440001", productName: "PPF", quantity: 2 },
        { productId: "550e8400-e29b-41d4-a716-446655440002", productName: "Ceramic", quantity: 1 },
      ]),
    ).toBeNull();
  });
});

describe("findDuplicateCustomName", () => {
  it("detects duplicate custom names case-insensitively", () => {
    expect(
      findDuplicateCustomName([
        { productId: null, productName: "Custom Wax", quantity: 1 },
        { productId: null, productName: " custom wax ", quantity: 2 },
      ]),
    ).toBe("custom wax");
  });
});

describe("buildOrderSummary", () => {
  it("counts products and total units", () => {
    expect(
      buildOrderSummary([
        { productId: "a", productName: "PPF", quantity: 2 },
        { productId: "b", productName: "Ceramic", quantity: 1 },
        { productId: null, productName: "", quantity: 1 },
      ]),
    ).toEqual({
      productCount: 2,
      totalUnits: 3,
      rows: [
        { name: "PPF", quantity: 2 },
        { name: "Ceramic", quantity: 1 },
      ],
    });
  });
});

describe("canSubmitOrderStep", () => {
  it("allows no order when placement is no", () => {
    expect(canSubmitOrderStep("no", [])).toBe(true);
  });

  it("blocks unset placement", () => {
    expect(canSubmitOrderStep(null, [])).toBe(false);
  });

  it("requires valid lines for yes placement", () => {
    expect(
      canSubmitOrderStep("yes", [{ productId: "a", productName: "PPF", quantity: 2 }]),
    ).toBe(true);
    expect(canSubmitOrderStep("yes", [])).toBe(false);
  });
});
