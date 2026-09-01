import type { VisitHistoryOrderItem } from "@/lib/types/visit-history";
import { formatCurrency } from "@/lib/utils/visit-history-format";

interface OrderItemsListProps {
  items: VisitHistoryOrderItem[];
  productCount: number;
  totalQuantity: number;
  orderValue?: number;
}

export function OrderItemsList({ items, productCount, totalQuantity, orderValue }: OrderItemsListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No order was placed during this visit.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li
            key={`${item.productName}-${item.quantity}`}
            className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
          >
            <span className="text-base font-medium">{item.productName}</span>
            <span className="shrink-0 text-sm text-muted-foreground">
              {item.quantity} {item.unit ?? "pcs"}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">
        {productCount} product{productCount === 1 ? "" : "s"} • {totalQuantity} unit
        {totalQuantity === 1 ? "" : "s"}
        {orderValue ? ` • ${formatCurrency(orderValue)}` : ""}
      </p>
    </div>
  );
}
