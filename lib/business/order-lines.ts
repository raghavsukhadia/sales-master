export interface OrderLineLike {
  productId: string | null;
  productName: string;
  quantity: number;
}

export interface OrderSummaryRow {
  name: string;
  quantity: number;
}

export interface OrderSummary {
  productCount: number;
  totalUnits: number;
  rows: OrderSummaryRow[];
}

function normalizeCustomName(name: string): string {
  return name.trim().toLowerCase();
}

export function findDuplicateCatalogProduct(lines: OrderLineLike[]): string | null {
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line.productId) continue;
    if (seen.has(line.productId)) return line.productId;
    seen.add(line.productId);
  }
  return null;
}

export function findDuplicateCustomName(lines: OrderLineLike[]): string | null {
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.productId) continue;
    const normalized = normalizeCustomName(line.productName);
    if (!normalized) continue;
    if (seen.has(normalized)) return line.productName.trim();
    seen.add(normalized);
  }
  return null;
}

export function getDuplicateCatalogProductName(
  lines: OrderLineLike[],
  productId: string,
  catalogNames: Map<string, string>,
): string {
  return catalogNames.get(productId) ?? lines.find((l) => l.productId === productId)?.productName ?? "This product";
}

export function buildOrderSummary(lines: OrderLineLike[]): OrderSummary {
  const filled = lines.filter((line) => line.productName.trim() && line.quantity > 0);
  const rows = filled.map((line) => ({
    name: line.productName.trim(),
    quantity: line.quantity,
  }));
  return {
    productCount: rows.length,
    totalUnits: rows.reduce((sum, row) => sum + row.quantity, 0),
    rows,
  };
}

export function isOrderLineComplete(line: OrderLineLike): boolean {
  return line.productName.trim().length > 0 && line.quantity > 0;
}

export type OrderPlacement = "yes" | "no" | null;

export function canSubmitOrderStep(
  placement: OrderPlacement,
  lines: OrderLineLike[],
): boolean {
  if (placement === "no") return true;
  if (placement !== "yes") return false;
  const filled = lines.filter(isOrderLineComplete);
  if (filled.length === 0) return false;
  if (findDuplicateCatalogProduct(filled)) return false;
  if (findDuplicateCustomName(filled)) return false;
  return true;
}
