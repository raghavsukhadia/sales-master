"use client";

import { useCallback, useMemo, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  buildOrderSummary,
  findDuplicateCatalogProduct,
  findDuplicateCustomName,
  getDuplicateCatalogProductName,
  isOrderLineComplete,
  type OrderPlacement,
} from "@/lib/business/order-lines";
import type { CatalogProduct } from "@/lib/types/catalog";
import { OrderSummaryPanel } from "@/components/salesman/order-summary";
import {
  ProductSearchField,
  type ProductSearchFieldHandle,
} from "@/components/salesman/product-search-field";
import { QuantityStepper } from "@/components/salesman/quantity-stepper";

export interface OrderLineRow {
  id: string;
  productId: string | null;
  productName: string;
  isCustom: boolean;
  quantity: number;
}

interface OrderLineItemsProps {
  products: CatalogProduct[];
  lines: OrderLineRow[];
  onChange: (lines: OrderLineRow[]) => void;
  orderPlacement: OrderPlacement;
}

function getLineDuplicateError(
  line: OrderLineRow,
  lines: OrderLineRow[],
  catalogNames: Map<string, string>,
): string | null {
  if (!isOrderLineComplete(line)) return null;

  if (line.productId) {
    const duplicateId = findDuplicateCatalogProduct(
      lines.filter(isOrderLineComplete).map((l) => ({
        productId: l.productId,
        productName: l.productName,
        quantity: l.quantity,
      })),
    );
    if (duplicateId === line.productId) {
      const count = lines.filter((l) => l.productId === line.productId && isOrderLineComplete(l)).length;
      if (count > 1) {
        return `${getDuplicateCatalogProductName(lines, duplicateId, catalogNames)} is already in this order.`;
      }
    }
    return null;
  }

  const normalized = line.productName.trim().toLowerCase();
  const customDuplicates = lines.filter(
    (l) =>
      !l.productId &&
      isOrderLineComplete(l) &&
      l.productName.trim().toLowerCase() === normalized,
  );
  if (customDuplicates.length > 1) {
    return `${line.productName.trim()} is already in this order.`;
  }

  const duplicateCustom = findDuplicateCustomName(
    lines.filter(isOrderLineComplete).map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
    })),
  );
  if (duplicateCustom && duplicateCustom.trim().toLowerCase() === normalized) {
    return `${duplicateCustom} is already in this order.`;
  }

  return null;
}

export function OrderLineItems({
  products,
  lines,
  onChange,
  orderPlacement,
}: OrderLineItemsProps) {
  const focusRefs = useRef<Map<string, ProductSearchFieldHandle>>(new Map());
  const pendingFocusId = useRef<string | null>(null);

  const catalogNames = useMemo(
    () => new Map(products.map((product) => [product.id, product.name])),
    [products],
  );

  const usedProductIds = useMemo(() => {
    const ids = new Set<string>();
    for (const line of lines) {
      if (line.productId && isOrderLineComplete(line)) ids.add(line.productId);
    }
    return ids;
  }, [lines]);

  const summary = useMemo(
    () =>
      buildOrderSummary(
        lines
          .filter(isOrderLineComplete)
          .map((line) => ({
            productId: line.productId,
            productName: line.productName,
            quantity: line.quantity,
          })),
      ),
    [lines],
  );

  const setFocusRef = useCallback((id: string, handle: ProductSearchFieldHandle | null) => {
    if (handle) {
      focusRefs.current.set(id, handle);
      if (pendingFocusId.current === id) {
        pendingFocusId.current = null;
        requestAnimationFrame(() => handle.focus());
      }
    } else {
      focusRefs.current.delete(id);
    }
  }, []);

  function updateLine(id: string, patch: Partial<OrderLineRow>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function addLine() {
    const newLine = createEmptyOrderLine();
    pendingFocusId.current = newLine.id;
    onChange([...lines, newLine]);
  }

  function removeLine(id: string) {
    if (lines.length <= 1) {
      onChange([createEmptyOrderLine()]);
      return;
    }
    onChange(lines.filter((line) => line.id !== id));
  }

  if (orderPlacement !== "yes") return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {lines.map((line) => {
          const headerLabel = line.productName.trim()
            ? `${line.productName.trim()} · Qty: ${line.quantity}`
            : "Order item";
          const duplicateError = getLineDuplicateError(line, lines, catalogNames);

          return (
            <div
              key={line.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{headerLabel}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(line.id)}
                  className="h-8 shrink-0 text-muted-foreground"
                  aria-label="Remove order item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <ProductSearchField
                ref={(handle) => setFocusRef(line.id, handle)}
                products={products}
                productId={line.productId}
                productName={line.productName}
                isCustom={line.isCustom}
                usedProductIds={usedProductIds}
                inputId={`product-${line.id}`}
                duplicateError={duplicateError}
                onSelectCatalog={(product) => {
                  if (usedProductIds.has(product.id) && product.id !== line.productId) return;
                  updateLine(line.id, {
                    productId: product.id,
                    productName: product.name,
                    isCustom: false,
                  });
                }}
                onSwitchToCustom={() => {
                  updateLine(line.id, {
                    productId: null,
                    isCustom: true,
                    productName: line.productName,
                  });
                }}
                onSwitchToCatalog={() => {
                  updateLine(line.id, {
                    productId: null,
                    productName: "",
                    isCustom: false,
                  });
                }}
                onCustomNameChange={(name) => {
                  updateLine(line.id, { productName: name, productId: null, isCustom: true });
                }}
              />

              <div className="flex flex-col gap-2">
                <Label htmlFor={`qty-${line.id}`}>Quantity</Label>
                <QuantityStepper
                  id={`qty-${line.id}`}
                  value={line.quantity}
                  onChange={(quantity) => updateLine(line.id, { quantity })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button type="button" variant="outline" size="lg" onClick={addLine} className="gap-2">
        <Plus className="h-4 w-4" />
        Add another item
      </Button>

      <OrderSummaryPanel summary={summary} />
    </div>
  );
}

export function createEmptyOrderLine(): OrderLineRow {
  return {
    id: crypto.randomUUID(),
    productId: null,
    productName: "",
    isCustom: false,
    quantity: 1,
  };
}

export function countFilledOrderLines(lines: OrderLineRow[]): number {
  return lines.filter(isOrderLineComplete).length;
}

export function canSubmitOrderStepFromLines(
  placement: OrderPlacement,
  lines: OrderLineRow[],
): boolean {
  if (placement === "no") return true;
  if (placement !== "yes") return false;

  const filled = lines.filter(isOrderLineComplete);
  if (filled.length === 0) return false;

  const catalogDup = findDuplicateCatalogProduct(
    filled.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
    })),
  );
  if (catalogDup) return false;

  const customDup = findDuplicateCustomName(
    filled.map((l) => ({
      productId: l.productId,
      productName: l.productName,
      quantity: l.quantity,
    })),
  );
  if (customDup) return false;

  return true;
}
