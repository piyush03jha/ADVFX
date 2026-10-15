"use client";

import { useEffect, useState } from "react";

import {
  IconBell,
  IconCheck,
  IconChevronRight,
  IconDeviceFloppy,
  IconLock,
  IconLogout,
  IconMail,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";

import { AccountShell } from "@/components/account/AccountShell";
import { Navbar } from "@/components/layout/SiteNavbar";
import { useAuth } from "@/context/AuthContext";

export default function AccountSettingsPage() {
  const { user, logout, refreshSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [productNews, setProductNews] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/account/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? data?.message ?? "Unable to save profile.");
      await refreshSession();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (passwordSaving) return;
    setPasswordError(null);
    setPasswordSaved(false);

    if (!currentPassword) {
      setPasswordError("Enter your current password.");
      return;
    }
    if (newPassword.length < 12) {
      setPasswordError("Your new password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("Choose a new password different from your current password.");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string | string[];
        error?: string;
      } | null;
      const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
      if (!response.ok) {
        throw new Error(data?.error ?? message ?? "Unable to update password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setPasswordOpen(false);
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : "Unable to update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    window.location.assign("/");
  }

  return (
    <>
      <Navbar />
      <AccountShell
        title="Settings"
        description="Manage your profile, notifications and account security."
      >
        <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
          <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[radial-gradient(circle_at_90%_0%,hsl(var(--primary)/0.14),transparent_32%),linear-gradient(135deg,hsl(var(--foreground)/0.065),hsl(var(--background)/0.02)_58%,hsl(var(--primary)/0.06))] p-5 shadow-[0_20px_65px_rgba(0,0,0,0.14)] sm:p-6">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/[0.07] blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-primary/20 bg-primary/[0.08] font-serif text-lg text-primary shadow-[0_0_35px_hsl(var(--primary)/0.08)]">
                  {(name || user?.name || "U").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-serif text-xl tracking-[-0.03em] text-foreground">{name || user?.name || "Your account"}</p>
                  <p className="mt-0.5 text-xs text-muted">Personal account</p>
                </div>
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.14em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Account active
              </div>
            <p id="email-help" className="mt-2 text-[10px] text-muted">Email changes are disabled here to keep your sign-in identity stable.</p>
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.015)_58%,hsl(var(--primary)/0.045))] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] sm:p-6">
            <SectionHeading icon={IconUser} eyebrow="Profile" title="Personal information" description="Keep your contact details up to date for orders and delivery communication." />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-muted">Full name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] px-3.5 text-sm text-foreground outline-none transition-colors focus:border-primary/40 focus:bg-white/[0.04]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-muted">Phone number</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="h-11 w-full rounded-xl border border-white/[0.1] bg-white/[0.025] px-3.5 text-sm text-foreground outline-none transition-colors focus:border-primary/40 focus:bg-white/[0.04]" />
              </label>
              <label className="block">
                <span className="mb-2 block text-[9px] font-medium uppercase tracking-[0.14em] text-muted">Email address</span>
                <div className="relative">
                  <IconMail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input type="email" value={email} readOnly autoComplete="email" aria-describedby="email-help" className="h-11 w-full cursor-not-allowed rounded-xl border border-white/[0.1] bg-white/[0.015] pl-10 pr-3.5 text-sm text-muted outline-none" />
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.015)_58%,hsl(var(--primary)/0.045))] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] sm:p-6">
            <SectionHeading icon={IconBell} eyebrow="Notifications" title="Stay in the loop" description="Choose which updates you want to receive from your account." />
            <div className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
              <ToggleRow label="Order updates" description="Production, shipping and delivery status for your orders." checked={orderUpdates} onChange={setOrderUpdates} />
              <ToggleRow label="Product news" description="New models, collections and occasional studio updates." checked={productNews} onChange={setProductNews} />
            </div>
          </section>

          <section className="rounded-3xl border border-white/[0.1] bg-[linear-gradient(135deg,hsl(var(--foreground)/0.045),hsl(var(--background)/0.015)_58%,hsl(var(--primary)/0.045))] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.12)] sm:p-6">
            <SectionHeading icon={IconShieldCheck} eyebrow="Security" title="Account protection" description="Manage the security controls that protect your account." />
            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setPasswordOpen((open) => !open);
                  setPasswordError(null);
                  setPasswordSaved(false);
                }}
                aria-expanded={passwordOpen}
                className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5 text-left transition-colors hover:border-primary/30 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-muted group-hover:text-primary"><IconLock size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">Change password</span><span className="mt-0.5 block text-xs text-muted">Update the password used to sign in.</span></span>
                <IconChevronRight size={16} className={`shrink-0 text-muted/70 transition-transform ${passwordOpen ? "rotate-90" : ""}`} />
              </button>
              {passwordOpen && (
                <div className="rounded-2xl border border-white/[0.08] bg-background/50 p-3.5 sm:p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-2 block text-xs font-medium text-foreground">Current password</span>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleChangePassword(); } }}
                        autoComplete="current-password"
                        required
                        className="h-11 w-full rounded-xl border border-white/[0.12] bg-background px-3.5 text-base text-foreground outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 sm:text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-foreground">New password</span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleChangePassword(); } }}
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        required
                        className="h-11 w-full rounded-xl border border-white/[0.12] bg-background px-3.5 text-base text-foreground outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 sm:text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-medium text-foreground">Confirm new password</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void handleChangePassword(); } }}
                        autoComplete="new-password"
                        minLength={12}
                        maxLength={128}
                        required
                        className="h-11 w-full rounded-xl border border-white/[0.12] bg-background px-3.5 text-base text-foreground outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 sm:text-sm"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-muted">Use at least 12 characters. Other active sessions will be signed out.</p>
                  {passwordError && <p role="alert" className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">{passwordError}</p>}
                  {passwordSaved && <p role="status" className="mt-3 rounded-lg border border-emerald-600/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200">Password updated successfully.</p>}
                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => { setPasswordOpen(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(null); }}
                      className="min-h-11 rounded-xl border border-white/[0.12] px-4 text-xs font-medium text-foreground hover:bg-white/[0.04]"
                    >Cancel</button>
                    <button
                      type="button"
                      onClick={() => void handleChangePassword()}
                      disabled={passwordSaving}
                      className="min-h-11 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >{passwordSaving ? "Updating…" : "Update password"}</button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-red-400/10 bg-[linear-gradient(135deg,hsl(var(--foreground)/0.035),hsl(var(--background)/0.015)_60%,rgba(127,29,29,0.06))] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.1)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/[0.04] text-red-300/80"><IconLogout size={16} /></div>
                <div><p className="text-sm font-medium text-foreground">Sign out of this account</p><p className="mt-0.5 text-xs text-muted">End your current session on this device.</p></div>
              </div>
              <button type="button" onClick={() => void handleLogout()} className="w-full rounded-xl border border-white/[0.1] bg-white/[0.025] px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:border-red-400/25 hover:bg-red-400/[0.05] hover:text-red-300 sm:w-auto">Sign out</button>
            </div>
          </section>

          {error && <p className="text-xs text-red-300" role="alert">{error}</p>}
          <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-5 text-muted">Profile edits are ready to be saved.</p>
            <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-[0_12px_35px_hsl(var(--primary)/0.16)] transition-all hover:-translate-y-0.5 sm:w-auto">
              {saved ? <IconCheck size={14} /> : <IconDeviceFloppy size={14} />}
              {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
            </button>
          </div>
        </form>
      </AccountShell>
    </>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, description }: { icon: typeof IconUser; eyebrow: string; title: string; description: string }) {
  return <div className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-muted"><Icon size={17} stroke={1.7} /></div><div><p className="text-[9px] font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h2 className="mt-1 text-base font-medium text-foreground sm:text-lg">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">{description}</p></div></div>;
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-5 py-4"><div className="min-w-0"><p className="text-sm font-medium text-foreground">{label}</p><p className="mt-1 text-xs leading-5 text-muted">{description}</p></div><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full border transition-all ${checked ? "border-primary/50 bg-primary/20" : "border-white/[0.12] bg-white/[0.04]"}`}><span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${checked ? "left-[22px] bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.45)]" : "left-1 bg-muted"}`} /></button></div>;
}
