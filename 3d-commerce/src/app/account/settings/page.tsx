import { AccountShell } from "@/components/account/AccountShell";
import { Navbar } from "@/components/layout/SiteNavbar";

export default function AccountSettingsPage() {
  return (
    <>
    <Navbar />
    <AccountShell
      title="Settings"
      description="Manage your profile and account preferences."
    >
      <div className="rounded-2xl border border-border bg-surface/50 p-6 text-sm text-muted">
        Account preferences and profile settings will appear here.
      </div>
    </AccountShell>
    
    </>
  );
}
