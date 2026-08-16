"use client";

import { useEffect, useState } from "react";
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

const PANELS = ["Overview", "Workspaces", "Users", "Errors", "Metrics", "Revenue", "Flags", "Audit"] as const;
type Panel = (typeof PANELS)[number];

/** Super-Admin Dashboard (spec Section 7) — internal operator surface, gated
 * to the SUPER_ADMIN role both here (client-side redirect for UX) and, for
 * real, on every /admin/* API call server-side. */
export default function AdminPage() {
  const [me, setMe] = useState<CurrentUser | null | "unauthorized">(null);
  const [panel, setPanel] = useState<Panel>("Overview");

  useEffect(() => {
    api
      .me()
      .then((u) => setMe(u.role === "super_admin" ? u : "unauthorized"))
      .catch(() => setMe("unauthorized"));
  }, []);

  if (me === null) return <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-400">Loading…</div>;
  if (me === "unauthorized") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Not authorized</h1>
        <p className="mt-2 text-sm text-gray-500">This dashboard is restricted to VeriSprint operators.</p>
        <a href="/login" className="mt-4 inline-block text-sm text-gray-900 underline">Sign in with a different account</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900">Super-Admin Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Signed in as {me.email ?? me.github_login} — cross-tenant view.</p>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-gray-200">
        {PANELS.map((p) => (
          <button
            key={p}
            onClick={() => setPanel(p)}
            className={`rounded-t-md px-3 py-2 text-sm font-medium ${
              panel === p ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-6">
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function OverviewPanel() {
  const [data, setData] = useState<AdminOverview | null>(null);
  useEffect(() => {
    api.adminOverview().then(setData);
  }, []);
  if (!data) return <p className="text-sm text-gray-400">Loading…</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard label="Workspaces" value={data.workspace_count} />
      <StatCard label="Active workspaces" value={data.active_workspace_count} />
      <StatCard label="Users" value={data.user_count} />
      <StatCard label="Total MRR" value={`$${data.total_mrr.toLocaleString()}`} />
      <StatCard label="Open errors" value={data.open_error_count} />
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
    <div>
      <input
        placeholder="Search by name or account…"
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-xs text-gray-500">
          <tr>
            <th className="py-2">Name</th>
            <th>Plan</th>
            <th>Status</th>
            <th>MRR</th>
            <th>Repos</th>
            <th>Users</th>
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {workspaces.map((ws) => (
            <tr key={ws.id}>
              <td className="py-2 font-medium text-gray-900">{ws.name}</td>
              <td className="capitalize">{ws.plan_tier}</td>
              <td>
                <span className={`rounded-full px-2 py-0.5 text-xs ${ws.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {ws.status}
                </span>
              </td>
              <td>${ws.mrr.toLocaleString()}</td>
              <td>{ws.repo_count}</td>
              <td>{ws.user_count}</td>
              <td>
                <button onClick={() => toggleStatus(ws)} className="text-xs text-gray-500 underline hover:text-gray-900">
                  {ws.status === "active" ? "Suspend" : "Reactivate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {workspaces.length === 0 && <p className="mt-4 text-sm text-gray-400">No workspaces found.</p>}
    </div>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    api.adminListUsers(search || undefined).then(setUsers);
  }, [search]);

  return (
    <div>
      <input
        placeholder="Search by email or GitHub login…"
        className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-xs text-gray-500">
          <tr>
            <th className="py-2">User</th>
            <th>Role</th>
            <th>Workspace</th>
            <th>Last login</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((u) => (
            <tr key={u.id}>
              <td className="py-2 font-medium text-gray-900">{u.email ?? u.github_login ?? u.id.slice(0, 8)}</td>
              <td className="capitalize">{u.role.replace("_", " ")}</td>
              <td className="text-gray-500">{u.workspace_name ?? "—"}</td>
              <td className="text-gray-400">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "never"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <p className="mt-4 text-sm text-gray-400">No users found.</p>}
    </div>
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

  const severityColor: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    error: "bg-orange-100 text-orange-700",
    warning: "bg-amber-100 text-amber-700",
    info: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)} />
        Include resolved
      </label>
      <div className="mt-4 space-y-2">
        {errors.map((e) => (
          <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${severityColor[e.severity] ?? "bg-gray-100"}`}>{e.severity}</span>
                <span className="text-xs text-gray-500">{e.source}</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-gray-900">{e.message}</p>
            {!e.resolved_at && (
              <button onClick={() => resolve(e.id)} className="mt-1 text-xs text-gray-500 underline hover:text-gray-900">
                Mark resolved
              </button>
            )}
          </div>
        ))}
        {errors.length === 0 && <p className="text-sm text-gray-400">No {includeResolved ? "" : "open "}errors — good sign.</p>}
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
    <div className="space-y-6">
      {Object.entries(byName).map(([name, points]) => (
        <div key={name}>
          <h3 className="text-sm font-medium text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500">Latest: {points[0]?.value} at {new Date(points[0]?.recorded_at).toLocaleString()}</p>
        </div>
      ))}
      {metrics.length === 0 && <p className="text-sm text-gray-400">No metrics recorded yet — the worker&apos;s 5-minute collector job needs to run at least once.</p>}
    </div>
  );
}

function RevenuePanel() {
  const [data, setData] = useState<AdminRevenue | null>(null);
  useEffect(() => {
    api.adminRevenue().then(setData);
  }, []);
  if (!data) return <p className="text-sm text-gray-400">Loading…</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total MRR" value={`$${data.total_mrr.toLocaleString()}`} />
        <StatCard label="Workspaces" value={data.workspace_count} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900">MRR by plan tier</h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {Object.entries(data.by_plan_tier).map(([tier, mrr]) => (
              <li key={tier} className="flex justify-between capitalize">
                <span>{tier}</span>
                <span>${mrr.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900">Workspaces by status</h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {Object.entries(data.by_status).map(([status, count]) => (
              <li key={status} className="flex justify-between capitalize">
                <span>{status}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </div>
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
        <input
          placeholder="new_feature_key"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <button onClick={create} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white">
          Create flag
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {flags.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm">
            <div>
              <p className="font-medium text-gray-900">{f.key}</p>
              {f.description && <p className="text-xs text-gray-500">{f.description}</p>}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={f.enabled_globally} onChange={() => toggle(f)} />
              Enabled globally
            </label>
          </div>
        ))}
        {flags.length === 0 && <p className="text-sm text-gray-400">No feature flags yet.</p>}
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
        <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{e.action}</span>
            <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {e.actor} · {e.entity_type} {e.entity_id.slice(0, 8)}
          </p>
        </div>
      ))}
      {entries.length === 0 && <p className="text-sm text-gray-400">No audit entries yet.</p>}
    </div>
  );
}
