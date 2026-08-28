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
  type ContactMessage,
  type CurrentUser,
  type PricingPlan,
} from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { Badge, Card, GhostButton, Input, PrimaryButton, StatCard } from "@/components/ui";

const PANELS = ["Overview", "Workspaces", "Users", "Errors", "Messages", "Metrics", "Revenue", "Pricing", "Flags", "Audit"] as const;
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
  // Lives at this level (not inside MessagesPanel) so the tab itself can
  // carry a notification badge even while a different panel is open —
  // that's the actual "admin gets notified" mechanism for a new
  // submission, alongside the best-effort email the API also sends.
  const [openMessageCount, setOpenMessageCount] = useState(0);

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

  useEffect(() => {
    if (me === null || me === "unauthorized") return;
    const refreshCount = () => api.adminOverview().then((o) => setOpenMessageCount(o.open_contact_message_count));
    refreshCount();
    // Polls every 30s so a message that arrives while an operator is
    // already looking at the console still surfaces without a manual
    // reload — the closest thing to a live notification this console has.
    const interval = setInterval(refreshCount, 30_000);
    return () => clearInterval(interval);
  }, [me]);

  if (me === "unauthorized") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Not authorized</h1>
        <p className="mt-3 text-[var(--text-dim)]">This console is restricted to VeriSprint operators.</p>
        <a href="/login" className="mt-6 text-sm font-semibold text-[var(--accent-neon)] hover:text-[var(--accent-neon-hover)]">
          Sign in with a different account →
        </a>
      </div>
    );
  }

  if (me === null) {
    return <div className="mx-auto max-w-6xl px-6 py-16 text-[var(--text-dim)]">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Operator Console</h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">
            Signed in as <span className="text-[var(--text-muted)]">{me.email ?? me.github_login}</span> — cross-tenant view.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-[var(--line)] pb-4">
        {PANELS.map((p) => (
          <button
            key={p}
            onClick={() => setPanel(p)}
            className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              panel === p ? "bg-[var(--accent-neon)] text-[#04201f]" : "text-[var(--text-dim)] hover:bg-[var(--accent-neon)]/5 hover:text-[var(--foreground)]"
            }`}
          >
            {p}
            {p === "Messages" && openMessageCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-[var(--foreground)]">
                {openMessageCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {panel === "Overview" && <OverviewPanel />}
        {panel === "Workspaces" && <WorkspacesPanel />}
        {panel === "Users" && <UsersPanel />}
        {panel === "Errors" && <ErrorsPanel />}
        {panel === "Messages" && <MessagesPanel onChange={() => api.adminOverview().then((o) => setOpenMessageCount(o.open_contact_message_count))} />}
        {panel === "Metrics" && <MetricsPanel />}
        {panel === "Revenue" && <RevenuePanel />}
        {panel === "Pricing" && <PricingPanel />}
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
  if (!data) return <p className="text-sm text-[var(--text-dim)]">Loading…</p>;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard label="Workspaces" value={data.workspace_count} />
      <StatCard label="Active workspaces" value={data.active_workspace_count} />
      <StatCard label="Users" value={data.user_count} />
      <StatCard label="Total MRR" value={`$${data.total_mrr.toLocaleString()}`} accent />
      <StatCard label="Open errors" value={data.open_error_count} accent={data.open_error_count > 0} />
      <StatCard label="Unresolved flags" value={data.unresolved_flag_count} />
      <StatCard label="New contact messages" value={data.open_contact_message_count} accent={data.open_contact_message_count > 0} />
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
          <thead className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
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
          <tbody className="divide-y divide-[var(--line)]">
            {workspaces.map((ws) => (
              <tr key={ws.id}>
                <td className="py-3 font-medium text-[var(--foreground)]">{ws.name}</td>
                <td className="capitalize text-[var(--text-muted)]">{ws.plan_tier}</td>
                <td>
                  <Badge tone={ws.status === "active" ? "success" : "danger"}>{ws.status}</Badge>
                </td>
                <td className="text-[var(--text-muted)]">${ws.mrr.toLocaleString()}</td>
                <td className="text-[var(--text-muted)]">{ws.repo_count}</td>
                <td className="text-[var(--text-muted)]">{ws.user_count}</td>
                <td>
                  <GhostButton onClick={() => toggleStatus(ws)}>{ws.status === "active" ? "Suspend" : "Reactivate"}</GhostButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {workspaces.length === 0 && <p className="mt-4 text-sm text-[var(--text-dim)]">No workspaces found.</p>}
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
          <thead className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
            <tr>
              <th className="py-2 font-semibold">User</th>
              <th className="font-semibold">Role</th>
              <th className="font-semibold">Workspace</th>
              <th className="font-semibold">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-3 font-medium text-[var(--foreground)]">{u.email ?? u.github_login ?? u.id.slice(0, 8)}</td>
                <td className="capitalize text-[var(--text-muted)]">{u.role.replace("_", " ")}</td>
                <td className="text-[var(--text-dim)]">{u.workspace_name ?? "—"}</td>
                <td className="text-[var(--text-dim)]">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <p className="mt-4 text-sm text-[var(--text-dim)]">No users found.</p>}
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
      <label className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
        <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)} />
        Include resolved
      </label>
      <div className="mt-4 space-y-2">
        {errors.map((e) => (
          <Card key={e.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone={severityTone[e.severity] ?? "default"}>{e.severity}</Badge>
                <span className="text-xs text-[var(--text-dim)]">{e.source}</span>
              </div>
              <span className="text-xs text-[var(--text-dim)]">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-[var(--text-muted)]">{e.message}</p>
            {!e.resolved_at && (
              <div className="mt-2">
                <GhostButton onClick={() => resolve(e.id)}>Mark resolved</GhostButton>
              </div>
            )}
          </Card>
        ))}
        {errors.length === 0 && <p className="text-sm text-[var(--text-dim)]">No {includeResolved ? "" : "open "}errors — good sign.</p>}
      </div>
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  enterprise: "Enterprise & Agency",
  security: "Security question",
  bug_report: "Something looks wrong",
  other: "Other",
};

function MessagesPanel({ onChange }: { onChange: () => void }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [includeResolved, setIncludeResolved] = useState(false);

  function load() {
    api.adminListContactMessages(includeResolved).then(setMessages);
  }
  useEffect(load, [includeResolved]);

  async function resolve(id: string) {
    await api.adminResolveContactMessage(id);
    load();
    onChange();
  }

  return (
    <div>
      <label className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
        <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)} />
        Include resolved
      </label>
      <div className="mt-4 space-y-2">
        {messages.map((m) => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--foreground)]">{m.name}</span>
                <a href={`mailto:${m.email}`} className="text-xs text-[var(--accent-neon)] hover:underline">{m.email}</a>
                <Badge tone="default">{REASON_LABEL[m.reason] ?? m.reason}</Badge>
              </div>
              <span className="text-xs text-[var(--text-dim)]">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-[var(--text-muted)]">{m.message}</p>
            {!m.resolved_at ? (
              <div className="mt-2">
                <GhostButton onClick={() => resolve(m.id)}>Mark resolved</GhostButton>
              </div>
            ) : (
              <p className="mt-2 text-xs text-[var(--text-dim)]">Resolved {new Date(m.resolved_at).toLocaleString()}</p>
            )}
          </Card>
        ))}
        {messages.length === 0 && <p className="text-sm text-[var(--text-dim)]">No {includeResolved ? "" : "new "}messages.</p>}
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
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{name}</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--accent-neon)]">{points[0]?.value}</p>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{new Date(points[0]?.recorded_at).toLocaleString()}</p>
        </Card>
      ))}
      {metrics.length === 0 && (
        <p className="text-sm text-[var(--text-dim)]">No metrics recorded yet — the worker&apos;s 5-minute collector job needs to run at least once.</p>
      )}
    </div>
  );
}

function RevenuePanel() {
  const [data, setData] = useState<AdminRevenue | null>(null);
  useEffect(() => {
    api.adminRevenue().then(setData);
  }, []);
  if (!data) return <p className="text-sm text-[var(--text-dim)]">Loading…</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total MRR" value={`$${data.total_mrr.toLocaleString()}`} accent />
        <StatCard label="Workspaces" value={data.workspace_count} />
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">MRR by plan tier</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
            {Object.entries(data.by_plan_tier).map(([tier, mrr]) => (
              <li key={tier} className="flex justify-between capitalize">
                <span>{tier}</span>
                <span className="tabular-nums">${mrr.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Workspaces by status</h3>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
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
              <p className="font-medium text-[var(--foreground)]">{f.key}</p>
              {f.description && <p className="text-xs text-[var(--text-dim)]">{f.description}</p>}
            </div>
            <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <input type="checkbox" checked={f.enabled_globally} onChange={() => toggle(f)} />
              Enabled globally
            </label>
          </Card>
        ))}
        {flags.length === 0 && <p className="text-sm text-[var(--text-dim)]">No feature flags yet.</p>}
      </div>
    </div>
  );
}

const SELF_SERVE_TIERS = ["team", "growth", "agency"] as const;
const DEFAULT_TIER_NAME: Record<(typeof SELF_SERVE_TIERS)[number], string> = {
  team: "Team",
  growth: "Growth",
  agency: "Agency",
};

function PricingPanel() {
  const [plans, setPlans] = useState<Record<string, PricingPlan>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedTier, setSavedTier] = useState<string | null>(null);

  function load() {
    api.listPricingPlans().then((list) => {
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
    });
  }
  useEffect(load, []);

  async function save(tier: string) {
    const raw = drafts[tier];
    const price_usd = Number(raw);
    if (!raw || Number.isNaN(price_usd) || price_usd < 0) return;
    setSaving(tier);
    try {
      await api.setPricingPlan(tier, { name: plans[tier]?.name || DEFAULT_TIER_NAME[tier as keyof typeof DEFAULT_TIER_NAME], price_usd });
      load();
      setSavedTier(tier);
      setTimeout(() => setSavedTier(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--text-dim)]">
        The live price for each self-serve tier — saving here creates a new Stripe Price and/or Paystack Plan
        automatically (both are immutable-by-design once created, so existing subscribers keep their old price;
        only new checkouts use the new one). FREE and Enterprise aren&apos;t priced here — Enterprise stays
        sales-assisted.
      </p>
      <div className="space-y-2">
        {SELF_SERVE_TIERS.map((tier) => {
          const plan = plans[tier];
          return (
            <Card key={tier} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--foreground)]">{plan?.name ?? DEFAULT_TIER_NAME[tier]}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-dim)]">
                  <span>/{plan?.billing_interval ?? "month"}</span>
                  {plan?.has_stripe_price ? <Badge tone="success">Stripe synced</Badge> : <Badge>No Stripe price yet</Badge>}
                  {plan?.has_paystack_plan ? <Badge tone="success">Paystack synced</Badge> : <Badge>No Paystack plan yet</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-dim)]">$</span>
                <Input
                  className="w-24"
                  value={drafts[tier] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [tier]: e.target.value }))}
                  placeholder="0"
                />
                <PrimaryButton onClick={() => save(tier)} disabled={saving === tier}>
                  {saving === tier ? "Saving…" : "Save"}
                </PrimaryButton>
                {savedTier === tier && <span className="text-xs font-medium text-emerald-400">Saved.</span>}
              </div>
            </Card>
          );
        })}
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
            <span className="font-medium text-[var(--foreground)]">{e.action}</span>
            <span className="text-xs text-[var(--text-dim)]">{new Date(e.created_at).toLocaleString()}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-dim)]">
            {e.actor} · {e.entity_type} {e.entity_id.slice(0, 8)}
          </p>
        </Card>
      ))}
      {entries.length === 0 && <p className="text-sm text-[var(--text-dim)]">No audit entries yet.</p>}
    </div>
  );
}
