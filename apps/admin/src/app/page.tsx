"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  type AdminErrorEvent,
  type AdminFeatureFlag,
  type AdminOverview,
  type AdminRevenue,
  type AdminSystemMetric,
  type AdminUser,
  type AdminWorkspace,
  type AuditLogEntry,
  type CurrentUser,
} from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { Badge, Card, GhostButton, Input, PrimaryButton, StatCard } from "@/components/ui";

const PANELS = ["Overview", "Workspaces", "Users", "Errors", "Metrics", "Revenue", "Flags", "Audit"] as const;
type Panel = (typeof PANELS)[number];

/** Super-Admin Dashboard (spec Section 7) — the whole reason apps/admin
 * exists as its own deploy: an internal, cross-tenant operator console,
 * separate from the customer-facing product (apps/web). Gated to
 * SUPER_ADMIN both here (redirect for UX) and, for real, on every
 * /admin/* API call server-side. */
export default function AdminHomePage() {
  const router = useRouter();
  const [me, setMe] = useState<CurrentUser | null | "unauthorized">(null);
  const [panel, setPanel] = useState<Panel>("Overview");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    api
      .me()
      .then((u) => {
        if (u.role !== "super_admin") {
          setMe("unauthorized");
        } else {
          setMe(u);
        }
      })
      .catch(() => setMe("unauthorized"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (me === "unauthorized") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-white">Not authorized</h1>
        <p className="mt-3 text-slate-400">This console is restricted to VeriSprint operators.</p>
        <a href="/login" className="mt-6 text-sm font-semibold text-[var(--accent-neon)] hover:text-[var(--accent-neon-hover)]">
          Sign in with a different account →
        </a>
      </div>
    );
  }

  if (me === null) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Operator Console</h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="text-slate-300">{me.email ?? me.github_login}</span> — cross-tenant view.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {PANELS.map((p) => (
          <button
            key={p}
            onClick={() => setPanel(p)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              panel === p ? "bg-[var(--accent-neon)] text-slate-900" : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {panel === "Overview" && <OverviewPanel />}
        {panel === "Workspaces" && <WorkspacesPanel />}
        {panel === "Users" && <UsersPanel />}
        {panel === "Errors" && <ErrorsPanel />}
        {panel === "Metrics" && <MetricsPanel />}
        {panel === "Revenue" && <RevenuePanel />}
        {panel === "Flags" && <FlagsPanel />}
        {panel === "Audit" && <AuditPanel />}
      </div>
    </div>
  );
}

function OverviewPanel() {
  const [data, setData] = useState<AdminOverview | null>(null);
  useEffect(() => {
    api.adminOverview().then(setData);
  }, []);
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard label="Workspaces" value={data.workspace_count} />
      <StatCard label="Active workspaces" value={data.active_workspace_count} />
      <StatCard label="Users" value={data.user_count} />
      <StatCard label="Total MRR" value={`$${data.total_mrr.toLocaleString()}`} accent />
      <StatCard label="Open errors" value={data.open_error_count} accent={data.open_error_count > 0} />
      <StatCard label="Unresolved flags" value={data.unresolved_flag_count} />
    </div>
  );
}

function WorkspacesPanel() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [search, setSearch] = useState("");

  function load() {
    api.adminListWorkspaces(search || undefined).then(setWorkspaces);
  }
  useEffect(load, [search]);

  async function toggleStatus(ws: AdminWorkspace) {
    const next = ws.status === "active" ? "suspended" : "active";
    await api.adminUpdateWorkspace(ws.id, { status: next });
    load();
  }

  return (
    <Card>
      <Input placeholder="Search by name or account…" className="w-full max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 font-semibold">Name</th>
              <th className="font-semibold">Plan</th>
              <th className="font-semibold">Status</th>
              <th className="font-semibold">MRR</th>
              <th className="font-semibold">Repos</th>
              <th className="font-semibold">Users</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {workspaces.map((ws) => (
              <tr key={ws.id}>
                <td className="py-3 font-medium text-white">{ws.name}</td>
                <td className="capitalize text-slate-300">{ws.plan_tier}</td>
                <td>
                  <Badge tone={ws.status === "active" ? "success" : "danger"}>{ws.status}</Badge>
                </td>
                <td className="text-slate-300">${ws.mrr.toLocaleString()}</td>
                <td className="text-slate-300">{ws.repo_count}</td>
                <td className="text-slate-300">{ws.user_count}</td>
                <td>
                  <GhostButton onClick={() => toggleStatus(ws)}>{ws.status === "active" ? "Suspend" : "Reactivate"}</GhostButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {workspaces.length === 0 && <p className="mt-4 text-sm text-slate-500">No workspaces found.</p>}
    </Card>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    api.adminListUsers(search || undefined).then(setUsers);
  }, [search]);

  return (
    <Card>
      <Input placeholder="Search by email or GitHub login…" className="w-full max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 font-semibold">User</th>
              <th className="font-semibold">Role</th>
              <th className="font-semibold">Workspace</th>
              <th className="font-semibold">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-3 font-medium text-white">{u.email ?? u.github_login ?? u.id.slice(0, 8)}</td>
                <td className="capitalize text-slate-300">{u.role.replace("_", " ")}</td>
                <td className="text-slate-400">{u.workspace_name ?? "—"}</td>
                <td className="text-slate-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <p className="mt-4 text-sm text-slate-500">No users found.</p>}
    </Card>
  );
}

function ErrorsPanel() {
  const [errors, setErrors] = useState<AdminErrorEvent[]>([]);
  const [includeResolved, setIncludeResolved] = useState(false);

  function load() {
    api.adminListErrors(includeResolved).then(setErrors);
  }
  useEffect(load, [includeResolved]);

  async function resolve(id: string) {
    await api.adminResolveError(id);
    load();
  }

  const severityTone: Record<string, "danger" | "warning" | "default"> = {
    critical: "danger",
    error: "danger",
    warning: "warning",
    info: "default",
  };

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-slate-400">
        <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)} />
        Include resolved
      </label>
      <div className="mt-4 space-y-2">
        {errors.map((e) => (
          <Card key={e.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={severityTone[e.severity] ?? "default"}>{e.severity}</Badge>
                <span className="text-xs text-slate-500">{e.source}</span>
              </div>
              <span className="text-xs text-slate-500">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-slate-200">{e.message}</p>
            {!e.resolved_at && (
              <div className="mt-2">
                <GhostButton onClick={() => resolve(e.id)}>Mark resolved</GhostButton>
              </div>
            )}
          </Card>
        ))}
        {errors.length === 0 && <p className="text-sm text-slate-500">No {includeResolved ? "" : "open "}errors — good sign.</p>}
      </div>
    </div>
  );
}

function MetricsPanel() {
  const [metrics, setMetrics] = useState<AdminSystemMetric[]>([]);
  useEffect(() => {
    api.adminListMetrics().then(setMetrics);
  }, []);

  const byName = metrics.reduce<Record<string, AdminSystemMetric[]>>((acc, m) => {
    (acc[m.metric_name] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(byName).map(([name, points]) => (
        <Card key={name}>
          <h3 className="text-sm font-semibold text-white">{name}</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--accent-neon)]">{points[0]?.value}</p>
          <p className="mt-1 text-xs text-slate-500">{new Date(points[0]?.recorded_at).toLocaleString()}</p>
        </Card>
      ))}
      {metrics.length === 0 && (
        <p className="text-sm text-slate-500">No metrics recorded yet — the worker&apos;s 5-minute collector job needs to run at least once.</p>
      )}
    </div>
  );
}

function RevenuePanel() {
  const [data, setData] = useState<AdminRevenue | null>(null);
  useEffect(() => {
    api.adminRevenue().then(setData);
  }, []);
  if (!data) return <p className="text-sm text-slate-500">Loading…</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total MRR" value={`$${data.total_mrr.toLocaleString()}`} accent />
        <StatCard label="Workspaces" value={data.workspace_count} />
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold text-white">MRR by plan tier</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {Object.entries(data.by_plan_tier).map(([tier, mrr]) => (
              <li key={tier} className="flex justify-between capitalize">
                <span>{tier}</span>
                <span className="tabular-nums">${mrr.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-white">Workspaces by status</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {Object.entries(data.by_status).map(([status, count]) => (
              <li key={status} className="flex justify-between capitalize">
                <span>{status}</span>
                <span className="tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function FlagsPanel() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [newKey, setNewKey] = useState("");

  function load() {
    api.adminListFlags().then(setFlags);
  }
  useEffect(load, []);

  async function toggle(flag: AdminFeatureFlag) {
    await api.adminUpdateFlag(flag.id, { enabled_globally: !flag.enabled_globally });
    load();
  }

  async function create() {
    if (!newKey.trim()) return;
    await api.adminCreateFlag({ key: newKey.trim() });
    setNewKey("");
    load();
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input placeholder="new_feature_key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        <PrimaryButton onClick={create}>Create flag</PrimaryButton>
      </div>
      <div className="mt-4 space-y-2">
        {flags.map((f) => (
          <Card key={f.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">{f.key}</p>
              {f.description && <p className="text-xs text-slate-500">{f.description}</p>}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input type="checkbox" checked={f.enabled_globally} onChange={() => toggle(f)} />
              Enabled globally
            </label>
          </Card>
        ))}
        {flags.length === 0 && <p className="text-sm text-slate-500">No feature flags yet.</p>}
      </div>
    </div>
  );
}

function AuditPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  useEffect(() => {
    api.adminAuditLog().then(setEntries);
  }, []);
  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <Card key={e.id}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-white">{e.action}</span>
            <span className="text-xs text-slate-500">{new Date(e.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {e.actor} · {e.entity_type} {e.entity_id.slice(0, 8)}
          </p>
        </Card>
      ))}
      {entries.length === 0 && <p className="text-sm text-slate-500">No audit entries yet.</p>}
    </div>
  );
}
