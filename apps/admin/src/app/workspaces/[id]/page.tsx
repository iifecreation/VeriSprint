"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  type AdminRepo,
  type AdminSubscription,
  type AdminUser,
  type AdminWorkspace,
  type AuditLogEntry,
  type CurrentAdmin,
} from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { APP_URL } from "@/lib/config";
import { Badge, Card, GhostButton, PrimaryButton } from "@/components/ui";

const STATUS_OPTIONS = ["active", "suspended", "canceled"];
const PLAN_TIER_OPTIONS = ["free", "team", "growth", "agency", "enterprise"];

const SELECT_CLASS =
  "rounded-lg border border-[var(--line)] bg-[var(--accent-neon)]/5 px-3 py-2 text-sm text-[var(--foreground)] capitalize focus:border-[var(--accent-neon)] focus:outline-none";

/**
 * Workspace drill-down (Operator Console): full cross-tenant detail for one
 * workspace — status/plan editing, billing snapshot, its repos and users,
 * a scoped slice of the global audit log, and "View as this workspace"
 * (app/routers/admin.py's impersonate_workspace) for seeing exactly what
 * that customer sees, without ever touching their password.
 */
export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [me, setMe] = useState<CurrentAdmin | null | "unauthorized">(null);
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

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    api.me().then(setMe).catch(() => setMe("unauthorized"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load() {
    api.adminGetWorkspace(id).then((w) => {
      setWs(w);
      setStatusDraft(w.status);
      setPlanDraft(w.plan_tier);
    });
    api.adminWorkspaceRepos(id).then(setRepos);
    api.adminListUsers(undefined, id).then(setUsers);
    api.adminWorkspaceSubscription(id).then(setSubscription);
    api.adminAuditLog(50, id).then(setAuditEntries);
  }
  useEffect(() => {
    if (me === null || me === "unauthorized") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, id]);

  async function save() {
    setSaving(true);
    try {
      await api.adminUpdateWorkspace(id, { status: statusDraft, plan_tier: planDraft });
      load();
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function viewAsWorkspace() {
    setImpersonateError(null);
    setImpersonating(true);
    try {
      const token = await api.adminImpersonateWorkspace(id);
      const fragment = `access_token=${encodeURIComponent(token.access_token)}&expires_in=${token.expires_in}`;
      window.open(`${APP_URL}/auth/callback#${fragment}`, "_blank", "noopener");
    } catch {
      setImpersonateError("Couldn't start a session — this workspace may have no user to view it as yet.");
    } finally {
      setImpersonating(false);
    }
  }

  if (me === "unauthorized") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Not authorized</h1>
        <p className="mt-3 text-[var(--text-dim)]">This console is restricted to VeriSprint operators.</p>
      </div>
    );
  }

  if (me === null || !ws) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-[var(--text-dim)]">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <GhostButton onClick={() => router.push("/")}>← Back to all workspaces</GhostButton>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{ws.name}</h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            {ws.account_login} · created {new Date(ws.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={ws.status === "active" ? "success" : "danger"}>{ws.status}</Badge>
          <Badge>{ws.plan_tier}</Badge>
        </div>
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">View as this workspace</h2>
            <p className="mt-1 max-w-md text-xs text-[var(--text-dim)]">
              Opens the product app in a new tab, signed in as this workspace&apos;s own admin — exactly what the
              customer sees. Logged to the audit trail below; expires in 15 minutes with no silent renewal.
              Browser storage is shared per-origin across tabs, so this replaces any VeriSprint session already open
              in this browser — use a private/incognito window to keep your own session untouched.
            </p>
          </div>
          <div className="text-right">
            <PrimaryButton onClick={viewAsWorkspace} disabled={impersonating}>
              {impersonating ? "Starting…" : "View as this workspace →"}
            </PrimaryButton>
            {impersonateError && <p className="mt-2 max-w-xs text-xs text-rose-400">{impersonateError}</p>}
          </div>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Status &amp; plan</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-dim)]">Status</label>
            <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)} className={SELECT_CLASS}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-dim)]">Plan tier</label>
            <select value={planDraft} onChange={(e) => setPlanDraft(e.target.value)} className={SELECT_CLASS}>
              {PLAN_TIER_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </PrimaryButton>
          {savedJustNow && <span className="text-xs font-medium text-emerald-400">Saved.</span>}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Billing</h2>
        {subscription ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            <span className="capitalize">{subscription.plan_tier}</span> ·{" "}
            <span className="capitalize">{subscription.status}</span> · ${subscription.mrr.toLocaleString()}/mo via{" "}
            {subscription.payment_provider ?? "—"}
            {subscription.renewed_at && <> · renews {new Date(subscription.renewed_at).toLocaleDateString()}</>}
          </p>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-dim)]">
            No subscription record yet — this workspace is on its free trial or hasn&apos;t subscribed.
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--text-dim)]">
          Denormalized MRR on the workspace row: ${ws.mrr.toLocaleString()}
        </p>
      </Card>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Repos ({repos.length})</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-muted)]">
            {repos.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{r.full_name}</span>
                {!r.is_active && <Badge tone="warning">inactive</Badge>}
              </li>
            ))}
            {repos.length === 0 && <p className="text-[var(--text-dim)]">No repos connected.</p>}
          </ul>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Users ({users.length})</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-muted)]">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{u.email ?? u.github_login}</span>
                <span className="shrink-0 text-xs capitalize text-[var(--text-dim)]">{u.role.replace("_", " ")}</span>
              </li>
            ))}
            {users.length === 0 && <p className="text-[var(--text-dim)]">No users yet.</p>}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent activity</h2>
        <div className="mt-3 space-y-2">
          {auditEntries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-[var(--foreground)]">{e.action}</span>
              <span className="shrink-0 text-xs text-[var(--text-dim)]">
                {e.actor} · {new Date(e.created_at).toLocaleString()}
              </span>
            </div>
          ))}
          {auditEntries.length === 0 && <p className="text-sm text-[var(--text-dim)]">No audit entries for this workspace yet.</p>}
        </div>
      </Card>
    </div>
  );
}
