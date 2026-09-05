"use client";

import { Navbar } from "@/components/layout/SiteNavbar";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressManager } from "@/components/account/AddressManager";

export default function AddressesPage() {
  return (
    <>
      <Navbar />
      <AccountShell
        title="Addresses"
        description="Manage the addresses used for your physical orders."
      >
        <AddressManager />
      </AccountShell>
    </>
  );
}
