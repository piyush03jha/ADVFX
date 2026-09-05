import type { OrderItem } from "@/config/orders";

interface OrderItemsProps {
  items: OrderItem[];
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function OrderItems({ items }: OrderItemsProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.productId}
          className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/70 bg-surface/40 p-2.5 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-4 sm:p-3"
        >
          <div className="h-13 w-13 overflow-hidden rounded-lg bg-surface-elevated sm:h-[72px] sm:w-[72px]">
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium leading-5 text-foreground sm:text-base">
              {item.name}
            </p>
            <p className="mt-0.5 text-[10px] text-muted sm:text-xs">
              Qty {item.quantity}
            </p>
          </div>

          <p className="whitespace-nowrap text-xs font-medium text-foreground sm:text-sm">
            {formatPrice(item.price * item.quantity)}
          </p>
        </div>
      ))}
    </div>
  );
}
