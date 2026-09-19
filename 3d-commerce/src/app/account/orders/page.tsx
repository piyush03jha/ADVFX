
import { AccountShell } from "@/components/account/AccountShell";
import { OrderCard } from "@/components/account/OrderCard";
import { Navbar } from "@/components/layout/SiteNavbar";
import { getBackendOrders } from "@/lib/account-orders";

export default async function OrdersPage() {
  let orders = [] as Awaited<ReturnType<typeof getBackendOrders>>;
  try {
    orders = await getBackendOrders();
  } catch {
    orders = [];
  }

  return (
    <>
      <Navbar />
      <AccountShell
        title="Orders"
        description="Track your physical orders from payment confirmation through delivery."
      >
        <div className="space-y-3">
          {orders.length > 0 ? (
            orders.map((order) => <OrderCard key={order.id} order={order} />)
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
              No orders found yet.
            </div>
          )}
        </div>
      </AccountShell>
    </>
  );
}
