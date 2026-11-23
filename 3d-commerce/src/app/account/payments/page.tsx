import { AccountShell } from "@/components/account/AccountShell";
import { Navbar } from "@/components/layout/SiteNavbar";
import { getBackendOrders } from "@/lib/account-orders";

const METHOD_LABELS: Record<string, string> = {
  card: "Card",
  upi: "UPI",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  paylater: "Pay later",
};

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  let last: {
    orderNumber: string;
    method: string;
    detail: string | null;
    status: string;
    when: string;
  } | null = null;

  try {
    const orders = await getBackendOrders();
    const withMethod = orders
      .filter((order) => order.payment?.method)
      .sort((a, b) => (b.payment?.updatedAt ?? "").localeCompare(a.payment?.updatedAt ?? ""));
    const order = withMethod[0];
    if (order?.payment?.method) {
      last = {
        orderNumber: order.orderNumber,
        method: METHOD_LABELS[order.payment.method] ?? order.payment.method,
        detail: order.payment.methodDetail ?? null,
        status: order.payment.status,
        when: order.payment.updatedAt
          ? new Date(order.payment.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
          : "",
      };
    }
  } catch {
    last = null;
  }

  return (
    <>
      <Navbar />
      <AccountShell
        title="Payment methods"
        description="The method you last used to pay for an order."
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[radial-gradient(circle_at_90%_0%,hsl(var(--primary)/0.1),transparent_30%),linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_55%,hsl(var(--primary)/0.09))] p-6 text-sm text-muted shadow-[0_18px_55px_rgba(0,0,0,0.12)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/[0.06] blur-2xl" />
          {last ? (
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Last payment attempted</p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {last.method}
                {last.detail ? <span className="ml-2 text-sm font-normal text-muted">{last.detail}</span> : null}
              </p>
              <p className="mt-1 text-xs">
                Order {last.orderNumber} · {last.status.replace(/_/g, " ").toLowerCase()}
                {last.when ? ` · ${last.when}` : ""}
              </p>
              <p className="mt-4 text-xs">Card numbers are never stored by Voxel 3D; payments are handled by Razorpay.</p>
            </div>
          ) : (
            <p className="relative">No payment attempts yet. The method you use at checkout will appear here.</p>
          )}
        </div>
      </AccountShell>
    </>
  );
}
