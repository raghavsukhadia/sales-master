import { z } from "zod";
import { findDuplicateCatalogProduct, findDuplicateCustomName } from "@/lib/business/order-lines";
import { INDIAN_MOBILE_REGEX, normalizeIndianMobile } from "@/lib/validations/dealer-draft";

export const orderLineSchema = z.object({
  productId: z.string().uuid().nullable(),
  productName: z.string().trim().min(1, "Product name is required"),
  quantity: z.number().positive("Quantity must be greater than zero"),
  unitPrice: z.number().nonnegative().default(0),
  unit: z.literal("pcs").default("pcs"),
});

const orderLinesRefinement = (data: { hasOrder: boolean; orderLines: z.infer<typeof orderLineSchema>[] }, ctx: z.RefinementCtx) => {
  if (!data.hasOrder) {
    if (data.orderLines.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Order lines must be empty when no order was placed.",
        path: ["orderLines"],
      });
    }
    return;
  }

  if (data.orderLines.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Add at least one order item.",
      path: ["orderLines"],
    });
    return;
  }

  const duplicateProductId = findDuplicateCatalogProduct(data.orderLines);
  if (duplicateProductId) {
    const name =
      data.orderLines.find((line) => line.productId === duplicateProductId)?.productName ??
      "This product";
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${name} is already in this order.`,
      path: ["orderLines"],
    });
  }

  const duplicateCustomName = findDuplicateCustomName(data.orderLines);
  if (duplicateCustomName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${duplicateCustomName} is already in this order.`,
      path: ["orderLines"],
    });
  }
};

const newDealerSchema = z
  .object({
    dealerMode: z.literal("new"),
    dealerName: z.string().trim().min(1, "Dealer name is required"),
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .refine((value) => INDIAN_MOBILE_REGEX.test(normalizeIndianMobile(value)), {
        message: "Enter a valid 10-digit mobile number",
      }),
    phones: z
      .array(
        z
          .string()
          .trim()
          .refine((value) => INDIAN_MOBILE_REGEX.test(normalizeIndianMobile(value)), {
            message: "Enter a valid 10-digit mobile number",
          }),
      )
      .optional()
      .default([]),
    address: z.string().trim().min(1, "Address is required"),
    city: z.string().trim().min(1, "City is required"),
    state: z.string().trim().optional(),
    pincode: z.string().trim().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    hasOrder: z.boolean(),
    orderLines: z.array(orderLineSchema),
  })
  .superRefine(orderLinesRefinement);

const existingDealerSchema = z
  .object({
    dealerMode: z.literal("existing"),
    dealerId: z.string().uuid("Invalid dealer"),
    hasOrder: z.boolean(),
    orderLines: z.array(orderLineSchema),
  })
  .superRefine(orderLinesRefinement);

export const recordVisitSchema = z.discriminatedUnion("dealerMode", [
  newDealerSchema,
  existingDealerSchema,
]);

export type OrderLineInput = z.infer<typeof orderLineSchema>;
export type RecordVisitInput = z.infer<typeof recordVisitSchema>;

/** Sum of unit_price × quantity for display and validation helpers. */
export function calculateOrderTotal(lines: Pick<OrderLineInput, "unitPrice" | "quantity">[]): number {
  return lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * (line.quantity ?? 1), 0);
}

export interface OrderLineUiRow {
  productId: string | null;
  productName: string;
  quantity: number | string;
}

/**
 * Normalize partially filled order rows from the UI before validation.
 * Drops rows where both product and quantity are empty; keeps rows where either has a value
 * so Zod can surface "complete this row" errors.
 */
export function normalizeOrderLines(
  rows: OrderLineUiRow[],
): { productId: string | null; productName: string; quantity: number; unitPrice: number; unit: "pcs" }[] {
  return rows
    .filter((row) => row.productName.trim() || String(row.quantity).trim())
    .map((row) => ({
      productId: row.productId ?? null,
      productName: row.productName.trim(),
      quantity:
        String(row.quantity).trim() === "" ? NaN : Number(row.quantity),
      unitPrice: 0,
      unit: "pcs" as const,
    }));
}

export function parseRecordVisitPayload(data: unknown): RecordVisitInput {
  return recordVisitSchema.parse(data);
}
