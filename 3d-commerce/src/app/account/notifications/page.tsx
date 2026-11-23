"use client";

import { useCallback, useEffect, useState } from "react";

import { IconBell, IconChecks } from "@tabler/icons-react";

import { AccountShell } from "@/components/account/AccountShell";
import { Navbar } from "@/components/layout/SiteNavbar";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to load notifications.");
      setItems(Array.isArray(data) ? (data as NotificationItem[]) : []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 20000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const unreadCount = items.filter((item) => !item.readAt).length;

  async function markRead(id: string) {
    const target = items.find((item) => item.id === id);
    if (!target || target.readAt) return;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH" });
      if (!response.ok) throw new Error();
    } catch {
      void load();
    }
  }

  async function markAllRead() {
    if (marking || unreadCount === 0) return;
    setMarking(true);
    try {
      const response = await fetch("/api/notifications/read-all", { method: "PATCH" });
      if (!response.ok) throw new Error();
      setItems((current) => current.map((item) => (item.readAt ? item : { ...item, readAt: new Date().toISOString() })));
    } catch {
      setError("Unable to mark notifications as read.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <>
      <Navbar />
      <AccountShell title="Notifications" description="Order updates and announcements from Voxel3D.">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted" aria-live="polite">
            {loading ? "Loading…" : unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={marking || unreadCount === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconChecks size={14} /> Mark all as read
          </button>
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-800 dark:text-red-200">
            {error}
          </p>
        )}

        {!loading && !error && items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface/60 p-8 text-center text-sm text-muted">
            <IconBell size={22} className="mx-auto mb-3 text-primary" />
            No notifications yet. Order updates and announcements will appear here.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => {
              const unread = !item.readAt;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void markRead(item.id)}
                    className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${unread ? "border-primary/35 bg-primary/[0.06]" : "border-border bg-surface/50"}`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className={`text-sm ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>{item.title}</span>
                        <span className="text-[10px] text-muted">{formatDate(item.createdAt)}</span>
                      </span>
                      <span className="mt-1 block whitespace-pre-line text-xs leading-5 text-muted">{item.message}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </AccountShell>
    </>
  );
}
