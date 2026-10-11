"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  api,
  type AdminRepo,
  type AdminSubscription,
  type AdminUser,
  type AdminWorkspace,
  type AuditLogEntry,
} from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { APP_URL } from "@/lib/config";
import { Badge, Card, GhostButton, PrimaryButton, Select } from "@/components/ui";
import {
  Building2,
  GitBranch,
  Users,
  CreditCard,
  History,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const STATUS_OPTIONS = ["active", "suspended", "canceled"];
const PLAN_TIER_OPTIONS = ["free", "team", "growth", "agency", "enterprise"];

export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ws, setWs] = useState<AdminWorkspace | null>(null);
  const [repos, setRepos] = useState<AdminRepo[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [subscription, setSubscription] = useState<AdminSubscription | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [statusDraft, setStatusDraft] = useState("");
  const [planDraft, setPlanDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([
      api.adminGetWorkspace(id),
      api.adminWorkspaceRepos(id).catch(() => []),
      api.adminListUsers(undefined, id).catch(() => []),
      api.adminWorkspaceSubscription(id).catch(() => null),
      api.adminAuditLog(50, id).catch(() => []),
    ])
      .then(([w, r, u, s, a]) => {
        setWs(w);
        setStatusDraft(w.status);
        setPlanDraft(w.plan_tier);
        setRepos(r);
        setUsers(u);
        setSubscription(s);
        setAuditEntries(a);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load workspace detail from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleSaveOverrides() {
    setSaving(true);
    try {
      const updated = await api.adminUpdateWorkspace(id, {
        status: statusDraft,
        plan_tier: planDraft,
      });
      setWs(updated);
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 2500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleImpersonate() {
    setImpersonating(true);
    setImpersonateError(null);
    try {
      const res = await api.adminImpersonateWorkspace(id);
      const fragment = `access_token=${encodeURIComponent(res.access_token)}&expires_in=${res.expires_in}`;
      window.open(`${APP_URL}/auth/callback#${fragment}`, "_blank", "noopener");
    } catch (err: unknown) {
      setImpersonateError(
        err instanceof Error ? err.message : "Failed to mint impersonation token. Verify user accounts exist."
      );
    } finally {
      setImpersonating(false);
    }
  }

  const dirty = ws && (statusDraft !== ws.status || planDraft !== ws.plan_tier);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={ws ? ws.name : "Loading Workspace…"}
        description={ws ? `Tenant Organization #${ws.id} • Managed via Control Plane` : "Connecting to server…"}
        breadcrumbs={[
          { label: "Workspaces", href: "/workspaces" },
          { label: ws ? ws.name : id },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh workspace detail"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
            <PrimaryButton
              onClick={handleImpersonate}
              disabled={impersonating || !ws}
              className="text-xs py-2 px-3.5"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>{impersonating ? "Minting Token…" : "Impersonate Session"}</span>
            </PrimaryButton>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {impersonateError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{impersonateError}</span>
          </div>
          <button
            onClick={() => setImpersonateError(null)}
            className="text-[11px] font-mono text-rose-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Workspace Overrides Banner */}
      <Card className="border-[var(--line)] bg-[var(--surface)]/40 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-5 w-5 text-brand" />
              <h3 className="text-base font-bold text-[var(--foreground)]">Administrative Overrides</h3>
              {ws && (
                <Badge variant={ws.status === "active" ? "success" : "danger"}>
                  {ws.status.toUpperCase()}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[var(--text-dim)]">
              Modify subscription tier entitlements or freeze tenant access. Updates take effect immediately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                Plan Tier
              </label>
              <Select
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                className="text-xs font-mono font-bold"
              >
                {PLAN_TIER_OPTIONS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
                Account Status
              </label>
              <Select
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                className="text-xs font-mono font-bold capitalize"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st.toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>

            <div className="pt-5">
              <PrimaryButton
                onClick={handleSaveOverrides}
                disabled={!dirty || saving}
                className="text-xs py-2 px-4"
              >
                {saving ? "Saving Changes…" : savedJustNow ? "Changes Saved!" : "Apply Overrides"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </Card>

      {/* Two-Column Grid: Users & Repositories */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Repositories Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-brand" />
              <h3 className="font-bold text-sm text-[var(--foreground)]">
                Connected Repositories ({repos.length})
              </h3>
            </div>
          </div>

          {repos.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-dim)]">
              No GitHub repositories synchronized with this workspace.
            </div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {repos.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-[var(--foreground)] truncate block">
                      {r.full_name}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-dim)]">
                      default branch: {r.default_branch}
                    </span>
                  </div>
                  <Badge variant={r.is_active ? "success" : "default"}>
                    {r.is_active ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Workspace Users Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              <h3 className="font-bold text-sm text-[var(--foreground)]">
                Organization Members ({users.length})
              </h3>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-dim)]">
              No users provisioned in this tenant organization.
            </div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {users.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between gap-3 text-xs first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--foreground)] truncate block">
                      {u.name || u.email || u.github_login || "Anonymous User"}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text-dim)]">
                      {u.email || `@${u.github_login}`}
                    </span>
                  </div>
                  <Badge variant={u.role === "workspace_admin" ? "accent" : "default"}>
                    {u.role.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Subscription & Audit Log */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Subscription Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-brand" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">Billing & Subscription</h3>
          </div>

          {subscription ? (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-[var(--line)]">
                <span className="text-[var(--text-dim)]">Plan Tier:</span>
                <span className="font-mono font-bold uppercase">{subscription.plan_tier}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--line)]">
                <span className="text-[var(--text-dim)]">Monthly Revenue:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ${(subscription.mrr || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--line)]">
                <span className="text-[var(--text-dim)]">Billing Status:</span>
                <span className="font-mono capitalize">{subscription.status}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-dim)]">Provider:</span>
                <span className="font-mono">{subscription.payment_provider || "Manual Invoice"}</span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-[var(--text-dim)]">
              No active paid subscription attached.
            </div>
          )}
        </Card>

        {/* Audit Trail Card */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-brand" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">Recent Tenant Audit Events</h3>
          </div>

          {auditEntries.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-dim)]">
              No recorded administrative audit events for this tenant.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {auditEntries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-[var(--line)]/50 bg-[var(--surface)]/30 p-2.5 text-xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-[var(--foreground)]">{entry.action}</span>
                    <span className="text-[var(--text-dim)] block text-[11px]">by {entry.actor}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[var(--text-dim)] shrink-0">
                    {new Date(entry.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
