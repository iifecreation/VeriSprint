"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminRevenue } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, StatCard, Badge, PrimaryButton } from "@/components/ui";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export default function RevenueOperationsPage() {
  const [data, setData] = useState<AdminRevenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminRevenue()
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load revenue data from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const totalMRR = data?.total_mrr ?? 0;
  const arr = totalMRR * 12;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Revenue Operations & MRR"
        description="Cross-tenant recurring subscription metrics, ARR projections, plan tier breakdown, and payment gateway health."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh revenue data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
            <Link href="/pricing">
              <PrimaryButton className="text-xs py-2 px-3.5">
                Pricing Catalog Config →
              </PrimaryButton>
            </Link>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* Top Financial Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Monthly Recurring"
          value={loading ? "…" : data ? `$${totalMRR.toLocaleString()}` : "—"}
          accent
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Annual Run Rate (ARR)"
          value={loading ? "…" : data ? `$${arr.toLocaleString()}` : "—"}
          accent
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Total Workspaces"
          value={loading ? "…" : data ? data.workspace_count : "—"}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Payment Gateway"
          value="Connected"
          sublabel="Stripe / Paystack Webhooks Active"
          icon={<CreditCard className="h-4 w-4" />}
        />
      </div>

      {/* Two Column Section: Tier Breakdown & Status Breakdown */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Plan Tier Distribution */}
        <Card className="p-6">
          <h3 className="font-bold text-base text-[var(--foreground)] mb-1">Subscriptions by Plan Tier</h3>
          <p className="text-xs text-[var(--text-dim)] mb-6">Active tenant allocation across pricing catalog tiers.</p>

          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-[var(--text-dim)]">
              Fetching breakdown from server…
            </div>
          ) : !data || Object.keys(data.by_plan_tier).length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-dim)]">
              No plan tier distribution data recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(data.by_plan_tier).map(([tier, count]) => {
                const pct = data.workspace_count > 0 ? (count / data.workspace_count) * 100 : 0;
                return (
                  <div key={tier} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold uppercase text-[var(--foreground)]">{tier}</span>
                      <span className="text-[var(--text-dim)]">
                        {count} tenants ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--surface)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Tenant Status Distribution */}
        <Card className="p-6">
          <h3 className="font-bold text-base text-[var(--foreground)] mb-1">Workspaces by Lifecycle Status</h3>
          <p className="text-xs text-[var(--text-dim)] mb-6">Current account states across the multi-tenant database.</p>

          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-[var(--text-dim)]">
              Fetching status data from server…
            </div>
          ) : !data || Object.keys(data.by_status).length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-dim)]">
              No account lifecycle records.
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(data.by_status).map(([status, count]) => {
                const pct = data.workspace_count > 0 ? (count / data.workspace_count) * 100 : 0;
                const isGood = status === "active";
                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold capitalize text-[var(--foreground)] flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${isGood ? "bg-emerald-400" : "bg-rose-400"}`} />
                        <span>{status}</span>
                      </span>
                      <span className="text-[var(--text-dim)]">
                        {count} workspaces ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--surface)] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isGood ? "bg-emerald-400" : "bg-rose-400"}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
