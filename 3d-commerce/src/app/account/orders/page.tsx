import { AccountShell } from "@/components/account/AccountShell";
import { OrderCard } from "@/components/account/OrderCard";
import { Navbar } from "@/components/layout/SiteNavbar";
import { orders } from "@/config/orders";

export default function OrdersPage() {
  return (
    <>
    <Navbar />
    <AccountShell
      title="Orders"
      description="Track your FORMA purchases from confirmation to delivery."
    >
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </AccountShell>
    </>
  );
}
