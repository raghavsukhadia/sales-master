import { describe, expect, it } from "vitest";
import {
  createSalesmanSchema,
  normalizeSalesmanPhone,
  parseCreateSalesmanInput,
  parseUpdateSalesmanInput,
  updateSalesmanSchema,
} from "./create-salesman";

describe("createSalesmanSchema", () => {
  const valid = {
    fullName: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul@example.com",
    password: "password123",
  };

  it("accepts valid input", () => {
    expect(createSalesmanSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(createSalesmanSchema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
  });

  it("rejects invalid phone", () => {
    expect(createSalesmanSchema.safeParse({ ...valid, phone: "123" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(createSalesmanSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(
      false,
    );
  });

  it("rejects short password", () => {
    expect(createSalesmanSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });
});

describe("updateSalesmanSchema", () => {
  const salesmanId = "550e8400-e29b-41d4-a716-446655440000";
  const valid = {
    id: salesmanId,
    fullName: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul@example.com",
  };

  it("accepts update without password", () => {
    const result = updateSalesmanSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBeUndefined();
    }
  });

  it("treats blank password as undefined", () => {
    const result = updateSalesmanSchema.safeParse({ ...valid, password: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBeUndefined();
    }
  });

  it("accepts optional password of at least 8 characters", () => {
    const result = updateSalesmanSchema.safeParse({
      ...valid,
      password: "newpass12",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.password).toBe("newpass12");
    }
  });

  it("rejects short optional password", () => {
    expect(
      updateSalesmanSchema.safeParse({ ...valid, password: "short" }).success,
    ).toBe(false);
  });

  it("rejects invalid id", () => {
    expect(updateSalesmanSchema.safeParse({ ...valid, id: "bad" }).success).toBe(false);
  });
});

describe("normalizeSalesmanPhone", () => {
  it("normalizes 10-digit mobile", () => {
    expect(normalizeSalesmanPhone("9876543210")).toBe("919876543210");
  });
});

describe("parseCreateSalesmanInput", () => {
  it("parses valid payload", () => {
    const parsed = parseCreateSalesmanInput({
      fullName: "Test",
      phone: "9876543210",
      email: "test@example.com",
      password: "password123",
    });
    expect(parsed.fullName).toBe("Test");
  });
});

describe("parseUpdateSalesmanInput", () => {
  it("parses valid update payload", () => {
    const parsed = parseUpdateSalesmanInput({
      id: "550e8400-e29b-41d4-a716-446655440000",
      fullName: "Updated",
      phone: "9876543210",
      email: "updated@example.com",
    });
    expect(parsed.fullName).toBe("Updated");
  });
});
