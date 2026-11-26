"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelOrderButton({ orderId, prepaid }: { orderId: string; prepaid: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [message, setMessage] = useState("");
  async function cancel() {
    if (busy || closed) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/orders/" + encodeURIComponent(orderId) + "/cancel", { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !["CANCELLED", "REFUNDED"].includes(data?.status)) {
        throw new Error(data?.error ?? "Unable to confirm cancellation. Refresh your order.");
      }
      setClosed(true);
      setConfirming(false);
      setMessage(data.paymentStatus === "REFUND_PENDING" ? "Order cancelled. Your refund is pending." : data.paymentStatus === "REFUNDED" ? "Order cancelled. Your refund has been processed." : "Order cancelled successfully.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to confirm cancellation.");
      router.refresh();
    } finally { setBusy(false); }
  }
  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      {!closed && !confirming && <button type="button" onClick={() => { setConfirming(true); setMessage(""); }} className="min-h-11 w-full rounded-lg border border-red-400/40 text-xs font-medium text-error hover:bg-red-400/10">Cancel order</button>}
      {confirming && !closed && <div className="space-y-3">
        <p className="text-sm font-medium">Cancel this order?</p>
        <p className="text-xs leading-5 text-muted">This action cannot be undone. {prepaid ? "If your online payment has been captured, we will initiate a refund to your original payment method." : "No payment is due for a successfully cancelled unpaid order."}</p>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => setConfirming(false)} className="flex-1 min-h-11 rounded-lg border border-border text-xs disabled:opacity-50">Keep order</button>
          <button type="button" disabled={busy} onClick={() => void cancel()} className="flex-1 min-h-11 rounded-lg bg-red-700 px-2 text-xs font-medium text-white disabled:opacity-50">{busy ? "Cancelling…" : "Confirm cancellation"}</button>
        </div>
      </div>}
      {message && <p role="status" className="text-xs leading-5 text-muted">{message}</p>}
    </div>
  );
}
