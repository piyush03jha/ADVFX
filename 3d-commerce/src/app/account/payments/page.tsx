import { AccountShell } from "@/components/account/AccountShell";
import { Navbar } from "@/components/layout/SiteNavbar";

export default function PaymentsPage() {
  return (
    <>
    <Navbar />
    <AccountShell
      title="Payment methods"
      description="Manage the payment methods used for your orders."
    >
      <div className="rounded-2xl border border-border bg-surface/50 p-6 text-sm text-muted">
        Saved payment methods will appear here. Payment details should be handled by the payment provider rather than stored directly by the storefront.
      </div>
    </AccountShell>
    </>
  );
}
