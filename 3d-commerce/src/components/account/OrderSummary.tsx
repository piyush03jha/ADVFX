export interface OrderSummaryData {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: {
    label: string;
    lastFour?: string;
  };
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export function OrderSummary({ order }: { order: OrderSummaryData }) {
  return (
    <div className="rounded-2xl border border-border bg-[linear-gradient(135deg,rgb(from var(--foreground) r g b / 0.065),rgb(from var(--background) r g b / 0.02)_55%,rgb(from var(--primary) r g b / 0.09))] p-3.5 shadow-[0_16px_50px_rgba(0,0,0,0.12)] sm:p-5">
      <h3 className="text-sm font-medium tracking-tight text-foreground sm:text-base">Payment summary</h3>
      <div className="mt-3 space-y-2 text-xs sm:mt-4 sm:space-y-2.5 sm:text-sm">
        <div className="flex justify-between gap-4"><span className="text-muted">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-muted">Shipping</span><span>{formatPrice(order.shipping)}</span></div>
        {order.discount > 0 && <div className="flex justify-between gap-4 text-primary"><span>Discount</span><span>-{formatPrice(order.discount)}</span></div>}
        <div className="flex justify-between gap-4"><span className="text-muted">Tax</span><span>{formatPrice(order.tax)}</span></div>
        <div className="my-2 border-t border-border sm:my-3" />
        <div className="flex items-center justify-between gap-4"><span className="font-medium text-foreground">Total</span><span className="text-base font-semibold text-foreground sm:text-lg">{formatPrice(order.total)}</span></div>
      </div>
      <div className="mt-3 rounded-xl border border-border bg-[linear-gradient(135deg,rgb(from var(--foreground) r g b / 0.045),rgb(from var(--primary) r g b / 0.035))] p-2.5 sm:mt-4 sm:p-3">
        <p className="text-[11px] uppercase tracking-[0.1em] text-muted sm:text-[11px]">Payment</p>
        <p className="mt-1 text-xs text-foreground sm:text-sm">{order.paymentMethod.label}{order.paymentMethod.lastFour ? ` •••• ${order.paymentMethod.lastFour}` : ""}</p>
      </div>
    </div>
  );
}
