"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  type AdminOverview,
  type AdminWorkspace,
  type AdminErrorEvent,
  type ContactMessage,
} from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, StatCard, Badge, PrimaryButton, GhostButton } from "@/components/ui";
import {
  Building2,
  Users,
  DollarSign,
  AlertTriangle,
  Mail,
  Flag,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Server,
  Zap,
  RefreshCw,
} from "lucide-react";

export default function AdminOverviewDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [recentWorkspaces, setRecentWorkspaces] = useState<AdminWorkspace[]>([]);
  const [recentErrors, setRecentErrors] = useState<AdminErrorEvent[]>([]);
  const [recentMessages, setRecentMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadAll() {
    setLoading(true);
    setError(null);
    Promise.all([
      api.adminOverview(),
      api.adminListWorkspaces(),
      api.adminListErrors(false),
      api.adminListContactMessages(false),
    ])
      .then(([overview, workspaces, errors, messages]) => {
        setData(overview);
        setRecentWorkspaces(workspaces.slice(0, 5));
        setRecentErrors(errors.slice(0, 4));
        setRecentMessages(messages.slice(0, 3));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard telemetry from server");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function resolveError(id: string) {
    try {
      await api.adminResolveError(id);
      api.adminListErrors(false).then((errs) => setRecentErrors(errs.slice(0, 4))).catch(() => {});
      api.adminOverview().then(setData).catch(() => {});
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to resolve error event");
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Operator Command Center"
        description="Cross-tenant telemetry, platform health, and operational dispatch."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-brand/40 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link href="/workspaces">
              <PrimaryButton className="text-xs py-2 px-4">
                Manage Workspaces →
              </PrimaryButton>
            </Link>
          </div>
        }
      />

      {/* Connection Alert if backend failed */}
      {error && <ServerConnectionAlert error={error} onRetry={loadAll} />}

      {/* System Alert Banners if critical errors or unread messages */}
      {data && (data.open_error_count > 0 || data.open_contact_message_count > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.open_error_count > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--foreground)]">
                    {data.open_error_count} Open System Error{data.open_error_count > 1 ? "s" : ""}
                  </h4>
                  <p className="text-xs text-rose-300/80">Worker or ingestion exceptions need operator attention.</p>
                </div>
              </div>
              <Link href="/errors">
                <GhostButton className="text-rose-400 border-rose-500/40 hover:bg-rose-500/20">
                  Triage Errors →
                </GhostButton>
              </Link>
            </div>
          )}

          {data.open_contact_message_count > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--foreground)]">
                    {data.open_contact_message_count} Inbound Inquir{data.open_contact_message_count > 1 ? "ies" : "y"}
                  </h4>
                  <p className="text-xs text-amber-300/80">Enterprise quote and security inquiries pending response.</p>
                </div>
              </div>
              <Link href="/messages">
                <GhostButton className="text-amber-400 border-amber-500/40 hover:bg-amber-500/20">
                  Open Inbox →
                </GhostButton>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Tenants"
          value={loading ? "…" : data ? data.workspace_count : "—"}
          sublabel={data ? `${data.active_workspace_count} active` : undefined}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Active Users"
          value={loading ? "…" : data ? data.user_count : "—"}
          sublabel="Cross-tenant total"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Total MRR"
          value={loading ? "…" : data ? `$${data.total_mrr.toLocaleString()}` : "—"}
          accent
          sublabel={data ? `~$${(data.total_mrr * 12).toLocaleString()} ARR` : undefined}
          icon={<DollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Open Errors"
          value={loading ? "…" : data ? data.open_error_count : "—"}
          accent={data ? data.open_error_count > 0 : false}
          sublabel="Exceptions & rollbacks"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Inbound Inquiries"
          value={loading ? "…" : data ? data.open_contact_message_count : "—"}
          sublabel="Enterprise contact"
          icon={<Mail className="h-4 w-4" />}
        />
        <StatCard
          label="Feature Flags"
          value={loading ? "…" : data ? data.unresolved_flag_count : "—"}
          sublabel="Config toggles"
          icon={<Flag className="h-4 w-4" />}
        />
      </div>

      {/* Two Column Section: Recent Workspaces & Unresolved Errors */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Workspaces Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-5 w-5 text-brand" />
              <h3 className="font-bold text-base text-[var(--foreground)]">Recent Organizations</h3>
            </div>
            <Link
              href="/workspaces"
              className="text-xs font-mono text-[var(--accent-neon)] hover:underline inline-flex items-center gap-1"
            >
              <span>View All ({data ? data.workspace_count : "…"})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-[var(--text-dim)]">
              Fetching organization directory from server…
            </div>
          ) : recentWorkspaces.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-dim)]">
              No workspaces provisioned yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {recentWorkspaces.map((ws) => (
                <div key={ws.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link
                      href={`/workspaces/${ws.id}`}
                      className="text-sm font-semibold text-[var(--foreground)] hover:text-brand hover:underline block truncate"
                    >
                      {ws.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs font-mono text-[var(--text-dim)]">
                      <span>@{ws.account_login}</span>
                      <span>•</span>
                      <span>{ws.user_count} users</span>
                      <span>•</span>
                      <span>{ws.repo_count} repos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={ws.plan_tier === "enterprise" ? "accent" : "default"}>
                      {ws.plan_tier.toUpperCase()}
                    </Badge>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        ws.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                      title={ws.status}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Unresolved Error Exceptions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <h3 className="font-bold text-base text-[var(--foreground)]">Recent Unresolved Exceptions</h3>
            </div>
            <Link
              href="/errors"
              className="text-xs font-mono text-[var(--accent-neon)] hover:underline inline-flex items-center gap-1"
            >
              <span>Error Inbox ({data ? data.open_error_count : "…"})</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-[var(--text-dim)]">
              Querying error events from server…
            </div>
          ) : recentErrors.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400/60 mb-2" />
              <p className="text-xs text-[var(--text-dim)]">No open system exceptions recorded. Platform is healthy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentErrors.map((err) => (
                <div
                  key={err.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)]/40 p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={err.severity === "critical" ? "danger" : "warning"}>
                        {err.severity.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-[11px] text-[var(--text-dim)]">{err.source}</span>
                      <span className="font-mono text-[10px] text-[var(--text-dim)]">
                        {new Date(err.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-[var(--foreground)] line-clamp-2">{err.message}</p>
                  </div>
                  <button
                    onClick={() => resolveError(err.id)}
                    className="shrink-0 rounded-lg border border-[var(--line)] px-2.5 py-1 text-[11px] font-mono font-semibold text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* System Status & Contact Messages Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Contact Message Preview */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Mail className="h-5 w-5 text-amber-400" />
              <h3 className="font-bold text-base text-[var(--foreground)]">Inbound Contact Inquiries</h3>
            </div>
            <Link
              href="/messages"
              className="text-xs font-mono text-[var(--accent-neon)] hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-[var(--text-dim)]">
              Checking inbound messages…
            </div>
          ) : recentMessages.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-dim)]">
              No unread customer contact submissions.
            </div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[var(--foreground)]">{msg.name}</span>
                      <span className="font-mono text-[11px] text-[var(--text-dim)]">&lt;{msg.email}&gt;</span>
                      <Badge variant="default">{msg.reason}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)] truncate">{msg.message}</p>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-dim)] shrink-0">
                    {new Date(msg.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Ops Controls */}
        <Card className="p-6">
          <h3 className="font-bold text-base text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand" />
            <span>Operational Dispatch</span>
          </h3>
          <div className="space-y-2.5">
            <Link
              href="/pricing"
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 p-3 text-xs font-semibold text-[var(--foreground)] hover:border-brand/50 hover:bg-[var(--surface)] transition-all"
            >
              <span>Catalog & Pricing Tier Management</span>
              <ArrowRight className="h-3.5 w-3.5 text-[var(--text-dim)]" />
            </Link>
            <Link
              href="/flags"
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 p-3 text-xs font-semibold text-[var(--foreground)] hover:border-brand/50 hover:bg-[var(--surface)] transition-all"
            >
              <span>Global Feature Flags & Killswitches</span>
              <ArrowRight className="h-3.5 w-3.5 text-[var(--text-dim)]" />
            </Link>
            <Link
              href="/metrics"
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 p-3 text-xs font-semibold text-[var(--foreground)] hover:border-brand/50 hover:bg-[var(--surface)] transition-all"
            >
              <span>Real-Time Ingestion Telemetry</span>
              <ArrowRight className="h-3.5 w-3.5 text-[var(--text-dim)]" />
            </Link>
            <Link
              href="/audit"
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)]/50 p-3 text-xs font-semibold text-[var(--foreground)] hover:border-brand/50 hover:bg-[var(--surface)] transition-all"
            >
              <span>Compliance & Operator Audit Trail</span>
              <ArrowRight className="h-3.5 w-3.5 text-[var(--text-dim)]" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
