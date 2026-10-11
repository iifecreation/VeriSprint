"use client";

import { useEffect, useState } from "react";
import { api, type PricingPlan, type Subscription } from "@/lib/api";
import { logout } from "@/lib/auth";
import { Badge, Card, PrimaryButton, SecondaryButton } from "@/components/ui";

const TIER_LABEL: Record<string, string> = { free: "Free", team: "Team", growth: "Growth", agency: "Agency", enterprise: "Enterprise" };

/**
 * The hard stop a trial-expired (or never-subscribed) workspace lands on —
 * apps/lib/api.ts's apiFetch redirects here globally on any 402 from a
 * gated endpoint (see app/billing_access.py). Deliberately has no sidebar
 * (see AppShell.tsx's HIDDEN_PREFIXES) — this is meant to read as a real
 * wall, not a page you can navigate around.
 */
export default function SubscribePage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [provider, setProvider] = useState<"stripe" | "paystack">("stripe");
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSubscription().then(setSub).catch(() => {});
    api.listPricingPlans().then(setPlans);
  }, []);

  async function subscribe(tier: string) {
    setError(null);
    setBusyTier(tier);
    try {
      const { checkout_url } = await api.createCheckout({
        plan_tier: tier,
        provider,
        success_url: `${window.location.origin}/dashboard`,
        cancel_url: `${window.location.origin}/subscribe`,
      });
      window.location.href = checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout — try again in a moment.");
      setBusyTier(null);
    }
  }

  const trialEnded = sub && !sub.has_active_access;

  return (
    <div className="relative min-h-screen overflow-hidden bg-sky-gradient">
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-neon)] text-[#04201f]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </span>

        <h1 className="mt-5 text-center text-3xl font-bold text-[var(--foreground)]">
          {trialEnded ? "Your free trial has ended" : "Choose a plan to continue"}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-[var(--text-muted)]">
          {trialEnded
            ? "Every real feature you connected a repo for is still here — pick a plan below to pick up right where you left off."
            : "Subscribe any time from here or from Settings → Plan & Billing."}
        </p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setProvider("stripe")}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${provider === "stripe" ? "border-brand bg-brand/10 text-brand" : "border-[var(--line-strong)] text-[var(--text-muted)]"}`}
          >
            Card (Stripe)
          </button>
          <button
            onClick={() => setProvider("paystack")}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${provider === "paystack" ? "border-brand bg-brand/10 text-brand" : "border-[var(--line-strong)] text-[var(--text-muted)]"}`}
          >
            Paystack
          </button>
        </div>

        {plans.length > 0 ? (
          <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
            {plans.map((p) => (
              <Card key={p.tier} className="flex flex-col">
                <p className="font-semibold text-[var(--foreground)]">{p.name || TIER_LABEL[p.tier]}</p>
                <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">
                  ${p.price_usd}
                  <span className="text-sm font-normal text-[var(--text-dim)]">/{p.billing_interval}</span>
                </p>
                <PrimaryButton className="mt-5 w-full justify-center" onClick={() => subscribe(p.tier)} disabled={busyTier === p.tier}>
                  {busyTier === p.tier ? "Redirecting…" : `Subscribe to ${p.name || TIER_LABEL[p.tier]}`}
                </PrimaryButton>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-8 w-full text-center">
            <p className="text-[var(--text-muted)]">
              Plans aren&apos;t configured yet on this deployment. Contact the workspace owner, or an operator can set live
              prices from the Operator Console&apos;s Pricing panel.
            </p>
          </Card>
        )}

        {error && <p className="mt-4 rounded-lg bg-rose-500/15 px-4 py-3 text-sm text-rose-400">{error}</p>}

        <div className="mt-8 flex items-center gap-3 text-sm">
          {sub && <Badge tone={sub.has_active_access ? "success" : "warning"}>{sub.has_active_access ? "Access active" : "Access paused"}</Badge>}
          <SecondaryButton onClick={() => logout()}>Log out</SecondaryButton>
        </div>
      </div>
    </div>
  );
}
