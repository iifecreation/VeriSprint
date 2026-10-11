"use client";

import { useEffect, useState } from "react";
import { api, type PricingPlan } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, Badge, Input, PrimaryButton, StatCard } from "@/components/ui";
import {
  Tag,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const SELF_SERVE_TIERS = ["team", "growth", "agency"] as const;
const DEFAULT_TIER_NAME: Record<(typeof SELF_SERVE_TIERS)[number], string> = {
  team: "Team",
  growth: "Growth",
  agency: "Agency",
};
const TIER_FEATURES: Record<(typeof SELF_SERVE_TIERS)[number], string> = {
  team: "Up to 10 repos, DORA metrics, Evidence Ledger, and Auto-Standups.",
  growth: "Unlimited repos, Risk Radar, PR AutoRoute, and Value Stream View.",
  agency: "Client Proof-of-Work Portals, custom branding, and multi-tenant reporting.",
};

export default function PricingCatalogPage() {
  const [plans, setPlans] = useState<Record<string, PricingPlan>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.listPricingPlans()
      .then((list) => {
        const byTier: Record<string, PricingPlan> = {};
        for (const p of list) byTier[p.tier] = p;
        setPlans(byTier);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const tier of SELF_SERVE_TIERS) {
            if (next[tier] === undefined) next[tier] = String(byTier[tier]?.price_usd ?? "");
          }
          return next;
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load pricing plans from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(tier: string) {
    const raw = drafts[tier];
    const price_usd = Number(raw);
    if (!Number.isFinite(price_usd) || price_usd < 0) {
      alert("Please enter a valid price (>= 0).");
      return;
    }
    setSavingTier(tier);
    try {
      const updated = await api.setPricingPlan(tier, {
        price_usd,
        name: DEFAULT_TIER_NAME[tier as (typeof SELF_SERVE_TIERS)[number]],
        billing_interval: "month",
        is_active: true,
      });
      setPlans((prev) => ({ ...prev, [tier]: updated }));
      setSavedTier(tier);
      setTimeout(() => setSavedTier(null), 2500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingTier(tier);
      setSavingTier(null);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Pricing Catalog & Plans"
        description="Global pricing catalog. Edits dynamically update pricing on marketing and checkout flows via the database."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh pricing plans"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Catalog Tiers" value={loading ? "…" : Object.keys(plans).length} icon={<Tag className="h-4 w-4" />} />
        <StatCard label="Team Price" value={loading ? "…" : plans.team ? `$${plans.team.price_usd}/mo` : "—"} accent icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Growth Price" value={loading ? "…" : plans.growth ? `$${plans.growth.price_usd}/mo` : "—"} accent icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Payment Gateways" value="Synchronized" sublabel="Stripe / Paystack Webhooks" icon={<Sparkles className="h-4 w-4" />} />
      </div>

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {SELF_SERVE_TIERS.map((tier) => {
          const current = plans[tier];
          const draftVal = drafts[tier] ?? (current ? String(current.price_usd) : "");
          const isDirty = current !== undefined && draftVal !== String(current.price_usd);
          const isSaving = savingTier === tier;
          const isSaved = savedTier === tier;

          return (
            <Card key={tier} className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-lg text-[var(--foreground)]">
                    {DEFAULT_TIER_NAME[tier]}
                  </span>
                  <Badge variant={tier === "growth" ? "accent" : "default"}>
                    {tier.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-xs text-[var(--text-dim)] leading-relaxed mb-6">
                  {TIER_FEATURES[tier]}
                </p>

                <div className="space-y-2 mb-6">
                  <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-dim)]">
                    Monthly Price (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-[var(--text-dim)]">
                      $
                    </span>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      className="pl-8 text-base font-mono font-bold"
                      value={draftVal}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [tier]: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                {current && (
                  <div className="space-y-1.5 text-[11px] font-mono text-[var(--text-dim)] py-3 border-t border-[var(--line)]">
                    <div className="flex justify-between">
                      <span>Live DB Price:</span>
                      <span className="font-bold text-[var(--foreground)]">${current.price_usd}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={current.is_active ? "text-emerald-400" : "text-neutral-500"}>
                        {current.is_active ? "Active" : "Archived"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span>{new Date(current.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--line)]">
                <PrimaryButton
                  onClick={() => handleSave(tier)}
                  disabled={!isDirty || isSaving}
                  className="w-full text-xs py-2.5"
                >
                  {isSaving ? (
                    "Syncing to API…"
                  ) : isSaved ? (
                    <span className="flex items-center gap-1.5 justify-center">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Updated!</span>
                    </span>
                  ) : isDirty ? (
                    `Save $${draftVal}/mo`
                  ) : (
                    "Price Current"
                  )}
                </PrimaryButton>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
