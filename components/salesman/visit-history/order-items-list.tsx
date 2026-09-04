import type { VisitHistoryOrderItem } from "@/lib/types/visit-history";
import { formatCurrency } from "@/lib/utils/visit-history-format";

interface OrderItemsListProps {
  items: VisitHistoryOrderItem[];
  productCount: number;
  totalQuantity: number;
  orderValue?: number;
}

export function OrderItemsList({
  items,
  productCount,
  totalQuantity,
  orderValue,
}: OrderItemsListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No order placed</p>;
  }

  return (
    <div className="flex flex-col">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="border-b border-border/60">
            <th
              scope="col"
              className="pb-2.5 text-left text-xs font-medium text-muted-foreground"
            >
              Product
            </th>
            <th
              scope="col"
              className="w-20 pb-2.5 text-right text-xs font-medium text-muted-foreground sm:w-24"
            >
              Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={`${item.productId ?? item.productName}-${index}`}
              className="border-b border-border/40 last:border-b-0"
            >
              <td className="py-3 pr-3 align-top text-base font-semibold leading-snug text-foreground break-words">
                {item.productName}
              </td>
              <td className="py-3 align-top text-right text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">
                {item.quantity}
                {item.unit ? ` ${item.unit}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-3 text-sm text-muted-foreground">
        {productCount} product{productCount === 1 ? "" : "s"} • {totalQuantity} total unit
        {totalQuantity === 1 ? "" : "s"}
        {orderValue ? ` • ${formatCurrency(orderValue)}` : ""}
      </p>
    </div>
  );
}
