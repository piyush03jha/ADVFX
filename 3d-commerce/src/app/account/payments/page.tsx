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
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[radial-gradient(circle_at_90%_0%,hsl(var(--primary)/0.1),transparent_30%),linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_55%,hsl(var(--primary)/0.09))] p-6 text-sm text-muted shadow-[0_18px_55px_rgba(0,0,0,0.12)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/[0.06] blur-2xl" />
          <p className="relative">Saved payment methods will appear here. Payment details should be handled by the payment provider rather than stored directly by the storefront.</p>
        </div>
      </AccountShell>
    </>
  );
}
