import { describe, expect, it } from "vitest";
import {
  createSalesmanSchema,
  normalizeSalesmanPhone,
  parseCreateSalesmanInput,
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
