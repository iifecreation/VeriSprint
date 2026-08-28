"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Subscription } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

function formatRemaining(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return `${Math.max(1, Math.floor(ms / (1000 * 60)))}m left`;
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h left`;
}

/**
 * Two real billing states surfaced honestly, not just near the deadline:
 * (1) a persistent trial countdown, shown the whole trial rather than only
 * near the end, so a subscribe prompt is never a surprise — disappears once
 * the workspace is on a real paid plan; and (2) a payment-failed warning
 * for a paid workspace mid-dunning (`status === "past_due"`), so a failed
 * card doesn't silently lapse into losing access with no notice. If the
 * trial has actually run out, apps/lib/api.ts's global 402 handling already
 * redirects to /subscribe on the next gated API call — this banner mostly
 * covers the "still active but running low" window, plus a fallback
 * message for the brief moment before that redirect fires.
 */
export function TrialBanner() {
  const [sub, setSub] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      api.getSubscription().then(setSub).catch(() => {});
    });
  }, []);

  if (!sub) return null;

  // A paid workspace whose last renewal charge failed — Stripe/Paystack
  // keep the plan active during this grace period (see
  // app/billing_access.py's workspace_has_active_access docstring), but the
  // account needs real attention before it lapses for real.
  if (sub.plan_tier !== "free" && sub.status === "past_due") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-rose-500/15 px-4 py-2 text-center text-sm font-medium text-rose-400">
        <span>Your last payment failed — update your billing details to avoid losing access.</span>
        <Link href="/settings" className="underline underline-offset-2 hover:opacity-80">
          Update payment
        </Link>
      </div>
    );
  }

  if (sub.plan_tier !== "free" || !sub.trial_ends_at) return null;

  const expired = !sub.has_active_access;
  const remaining = formatRemaining(sub.trial_ends_at);
  const urgent = expired || remaining.endsWith("m left") || (remaining.endsWith("h left") && !remaining.includes("d "));

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm font-medium ${
        urgent ? "bg-amber-500/15 text-amber-400" : "bg-[var(--accent-neon)]/10 text-brand"
      }`}
    >
      <span>{expired ? "Your free trial has ended." : `Free trial — ${remaining}.`}</span>
      <Link href="/subscribe" className="underline underline-offset-2 hover:opacity-80">
        {expired ? "Subscribe to keep using VeriSprint" : "Subscribe now"}
      </Link>
    </div>
  );
}
