import { AccountShell } from "@/components/account/AccountShell";
import { AccountOverview } from "@/components/account/AccountOverview";
import { Navbar } from "@/components/layout/SiteNavbar";

export default function AccountPage() {
  return (
    <>
    <Navbar />
    <AccountShell
      title="Welcome back."
      description="Manage your orders, delivery details, wishlist and account preferences."
    >
      <AccountOverview />
    </AccountShell>
    </>
  );
}
