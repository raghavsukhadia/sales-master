import { z } from "zod";
import { normalizeIndianMobile } from "@/lib/utils/phone";

export const createSalesmanSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine((value) => normalizeIndianMobile(value) !== null, {
      message: "Enter a valid Indian mobile number",
    }),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateSalesmanInput = z.infer<typeof createSalesmanSchema>;

export function parseCreateSalesmanInput(data: unknown): CreateSalesmanInput {
  return createSalesmanSchema.parse(data);
}

export function normalizeSalesmanPhone(phone: string): string {
  const normalized = normalizeIndianMobile(phone);
  if (!normalized) {
    throw new Error("Invalid phone number");
  }
  return normalized;
}
