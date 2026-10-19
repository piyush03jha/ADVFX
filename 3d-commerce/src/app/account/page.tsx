import { AccountShell } from "@/components/account/AccountShell";
import { AccountOverview } from "@/components/account/AccountOverview";
import { Navbar } from "@/components/layout/SiteNavbar";
import { getAccountStats } from "@/lib/account-stats";

export default async function AccountPage() {
  const stats = await getAccountStats();

  return (
    <>
      <Navbar />
      <AccountShell
        title="Welcome back."
        description="Manage your orders, delivery details and account preferences."
      >
        <AccountOverview stats={stats} />
      </AccountShell>
    </>
  );
}
