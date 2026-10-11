"use client";

import { useEffect, useState } from "react";
import {
  api,
  type AIToolCostReport,
  type AIToolSubscription,
  type AllocationReport,
  type CapitalizationReport,
  type ChangelogDay,
  type ContributionReport,
  type ValueStreamReport,
} from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { useAccessTokenClaims } from "@/lib/auth";
import { Card, Input, LoadingState, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";

const FLAG_KEYS = [
  "value_stream_view",
  "cost_capitalization",
  "investment_allocation",
  "visual_changelog",
  "ai_contribution_tracker",
  "ai_tool_cost_tracking",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Analytics: the deeper reporting feature set — Value Stream View, Cost
 * Capitalization, Investment Allocation, Visual Changelog, and the AI
 * Contribution Tracker. Each panel is gated by its own workspace feature
 * flag (Operator Console → Flags); off by default.
 */
export default function AnalyticsPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [start, setStart] = useState(daysAgoISO(30));
  const [end, setEnd] = useState(todayISO());
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  const workspaceId = useAccessTokenClaims()?.workspace_id ?? null;

  useEffect(() => {
    api.resolvedFeatureFlags(FLAG_KEYS).then((r) => setFlags(r.flags));
  }, []);

  const periodStart = `${start}T00:00:00Z`;
  const periodEnd = `${end}T23:59:59Z`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Analytics"
        subtitle="Value stream timing, cost capitalization, investment allocation, the visual changelog, and AI contribution tracking."
        actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />}
      />

      <div className="mt-6 flex gap-3">
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      {!flags ? (
        <p className="mt-8 text-sm text-[var(--text-dim)]">Loading…</p>
      ) : (
        <div className="mt-8 grid gap-6">
          <Panel title="Value Stream View" enabled={flags.value_stream_view}>
            {repoId && flags.value_stream_view && <ValueStreamPanel repoId={repoId} start={periodStart} end={periodEnd} />}
          </Panel>
          <Panel title="Cost Capitalization" enabled={flags.cost_capitalization}>
            {repoId && flags.cost_capitalization && <CapitalizationPanel repoId={repoId} start={periodStart} end={periodEnd} />}
          </Panel>
          <Panel title="Investment Allocation" enabled={flags.investment_allocation}>
            {workspaceId && flags.investment_allocation && <AllocationPanel workspaceId={workspaceId} start={periodStart} end={periodEnd} />}
          </Panel>
          <Panel title="Visual Changelog" enabled={flags.visual_changelog}>
            {repoId && flags.visual_changelog && <ChangelogPanel repoId={repoId} start={periodStart} end={periodEnd} />}
          </Panel>
          <Panel title="AI Contribution Tracker" enabled={flags.ai_contribution_tracker}>
            {repoId && flags.ai_contribution_tracker && <ContributionsPanel repoId={repoId} start={periodStart} end={periodEnd} />}
          </Panel>
          <Panel title="AI Tool Cost Tracking" enabled={flags.ai_tool_cost_tracking}>
            {flags.ai_tool_cost_tracking && <AIToolCostPanel repoId={repoId} />}
          </Panel>
        </div>
      )}
    </div>
  );
}

function Panel({ title, enabled, children }: { title: string; enabled: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="font-semibold text-[var(--foreground)]">{title}</h2>
      {enabled ? (
        children
      ) : (
        <p className="mt-2 text-xs text-[var(--text-dim)]">Not enabled for your workspace — a Super Admin can turn this on from the Operator Console.</p>
      )}
    </Card>
  );
}

function ValueStreamPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<ValueStreamReport | null>(null);
  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setData(null);
      api.getValueStream(repoId, start, end).then(setData);
    });
  }, [repoId, start, end]);

  if (!data) return <div className="mt-3"><LoadingState /></div>;
  if (data.stages.length === 0) return <p className="mt-2 text-sm text-[var(--text-dim)]">No tracked status transitions in this period yet.</p>;

  return (
    <div className="mt-3">
      <p className="text-xs text-[var(--text-dim)]">{data.tracked_ticket_count} ticket(s) with tracked transitions.</p>
      <ul className="mt-3 space-y-2">
        {data.stages.map((s) => (
          <li key={s.status} className="flex items-center justify-between rounded-xl bg-[var(--background)] px-3 py-2 text-sm">
            <span className="font-medium text-[var(--text-muted)]">{s.status}</span>
            <span className="text-[var(--text-dim)]">{s.avg_hours}h avg · {s.sample_count} sample(s)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CapitalizationPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<CapitalizationReport | null>(null);
  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setData(null);
      api.getCapitalization(repoId, start, end).then(setData);
    });
  }, [repoId, start, end]);

  if (!data) return <div className="mt-3"><LoadingState /></div>;

  return (
    <div className="mt-3">
      <ul className="space-y-2">
        {data.entries.map((e) => (
          <li key={e.category} className="rounded-xl bg-[var(--background)] px-3 py-2 text-sm">
            <p className="font-medium text-[var(--text-muted)]">{e.category === "capitalizable_new_development" ? "Capitalizable new development" : "Non-capitalizable maintenance"}</p>
            <p className="text-[var(--text-dim)]">
              {e.estimated_hours}h est. · {e.commit_count} commit(s) · {e.ticket_count} ticket(s)
              {e.estimated_cost_usd !== null && <> · ${e.estimated_cost_usd.toLocaleString()}</>}
            </p>
          </li>
        ))}
      </ul>
      {data.hourly_rate_usd === null && (
        <p className="mt-2 text-xs text-[var(--text-dim)]">Set an hourly rate in Settings to see dollar figures.</p>
      )}
      <p className="mt-3 text-xs text-[var(--text-dim)]">{data.method_note}</p>
    </div>
  );
}

function AllocationPanel({ workspaceId, start, end }: { workspaceId: string; start: string; end: string }) {
  const [data, setData] = useState<AllocationReport | null>(null);
  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setData(null);
      api.getAllocation(workspaceId, start, end).then(setData);
    });
  }, [workspaceId, start, end]);

  if (!data) return <div className="mt-3"><LoadingState /></div>;
  if (data.by_repo.length === 0) return <p className="mt-2 text-sm text-[var(--text-dim)]">No commit activity in this period yet.</p>;

  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">By repo</p>
        <ul className="mt-2 space-y-1.5">
          {data.by_repo.map((e) => (
            <li key={e.label} className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">{e.label}</span>
              <span className="text-[var(--text-dim)]">{e.pct_of_commits}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">By person</p>
        <ul className="mt-2 space-y-1.5">
          {data.by_person.map((e) => (
            <li key={e.label} className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-muted)]">@{e.label}</span>
              <span className="text-[var(--text-dim)]">{e.pct_of_commits}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ChangelogPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<ChangelogDay[] | null>(null);
  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setData(null);
      api.getChangelog(repoId, start, end).then(setData);
    });
  }, [repoId, start, end]);

  if (!data) return <div className="mt-3"><LoadingState /></div>;
  if (data.length === 0) return <p className="mt-2 text-sm text-[var(--text-dim)]">No merged PRs in this period yet.</p>;

  return (
    <div className="mt-3 space-y-4">
      {data.map((day) => (
        <div key={day.day}>
          <p className="text-xs font-semibold text-[var(--text-dim)]">
            {new Date(day.day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — {day.merged_pr_count} merged, {day.commit_count} commit(s)
          </p>
          <ul className="mt-1 space-y-1">
            {day.entries.map((e) => (
              <li key={e} className="text-sm text-[var(--text-muted)]">{e}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AIToolCostPanel({ repoId }: { repoId: string | null }) {
  const role = useAccessTokenClaims()?.role ?? null;
  const isAdmin = role === "workspace_admin" || role === "super_admin";
  const [report, setReport] = useState<AIToolCostReport | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toolName, setToolName] = useState("");
  const [seatCount, setSeatCount] = useState("1");
  const [costPerSeat, setCostPerSeat] = useState("");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [startedOn, setStartedOn] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setReport(await api.getAIToolCostReport(repoId));
  }

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setReport(null);
      refresh();
    });
  }, [repoId]);

  async function handleAdd() {
    if (!toolName.trim() || !costPerSeat) return;
    setSaving(true);
    try {
      await api.createAIToolSubscription({
        tool_name: toolName.trim(),
        seat_count: Number(seatCount) || 1,
        cost_per_seat_usd: Number(costPerSeat),
        billing_period: billingPeriod,
        started_on: startedOn,
      });
      setToolName("");
      setCostPerSeat("");
      setSeatCount("1");
      setShowForm(false);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteAIToolSubscription(id);
    await refresh();
  }

  if (!report) return <div className="mt-3"><LoadingState /></div>;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-[var(--foreground)]">${report.total_monthly_cost_usd.toLocaleString()}<span className="ml-1 text-sm font-normal text-[var(--text-dim)]">/mo</span></p>
        <p className="text-xs text-[var(--text-dim)]">{report.active_subscription_count} active subscription(s)</p>
      </div>

      {report.repo_ai_assisted_pct !== null && (
        <p className="mt-2 rounded-lg bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-muted)]">
          Selected repo's AI-disclosed adoption: <span className="font-semibold">{report.repo_ai_assisted_pct}%</span>
          {report.cost_per_adoption_point_usd !== null && (
            <> · ${report.cost_per_adoption_point_usd.toLocaleString()}/mo per adoption point</>
          )}
        </p>
      )}
      {report.repo_ai_assisted_pct === null && repoId && (
        <p className="mt-2 text-xs text-[var(--text-dim)]">No commits in the selected repo yet to compute adoption.</p>
      )}

      <ul className="mt-3 space-y-1.5">
        {report.subscriptions.map((s: AIToolSubscription) => (
          <li key={s.id} className="flex items-center justify-between rounded-xl bg-[var(--background)] px-3 py-2 text-sm">
            <div>
              <span className={`font-medium ${s.is_active ? "text-[var(--text-muted)]" : "text-[var(--text-dim)] line-through"}`}>{s.tool_name}</span>
              <span className="ml-2 text-[var(--text-dim)]">{s.seat_count} seat(s) · ${s.monthly_cost_usd.toLocaleString()}/mo</span>
            </div>
            {isAdmin && (
              <button onClick={() => handleDelete(s.id)} className="text-xs font-medium text-rose-500 hover:text-rose-600">
                Remove
              </button>
            )}
          </li>
        ))}
        {report.subscriptions.length === 0 && <p className="text-sm text-[var(--text-dim)]">No AI tool subscriptions tracked yet.</p>}
      </ul>

      {isAdmin && (
        <div className="mt-4 border-t border-[var(--line)] pt-4">
          {!showForm ? (
            <SecondaryButton onClick={() => setShowForm(true)}>+ Add subscription</SecondaryButton>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="Tool name (e.g. GitHub Copilot)" value={toolName} onChange={(e) => setToolName(e.target.value)} />
              <Input placeholder="Cost per seat (USD)" type="number" value={costPerSeat} onChange={(e) => setCostPerSeat(e.target.value)} />
              <Input placeholder="Seat count" type="number" value={seatCount} onChange={(e) => setSeatCount(e.target.value)} />
              <select
                className="rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value as "monthly" | "annual")}
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
              <Input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
              <div className="flex items-center gap-2">
                <PrimaryButton onClick={handleAdd} disabled={saving || !toolName.trim() || !costPerSeat}>
                  {saving ? "Saving…" : "Save"}
                </PrimaryButton>
                <SecondaryButton onClick={() => setShowForm(false)}>Cancel</SecondaryButton>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--text-dim)]">{report.method_note}</p>
    </div>
  );
}

function ContributionsPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<ContributionReport | null>(null);
  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setData(null);
      api.getContributions(repoId, start, end).then(setData);
    });
  }, [repoId, start, end]);

  if (!data) return <div className="mt-3"><LoadingState /></div>;
  if (data.contributors.length === 0) return <p className="mt-2 text-sm text-[var(--text-dim)]">No commits in this period yet.</p>;

  return (
    <div className="mt-3">
      <ul className="space-y-1.5">
        {data.contributors.map((c) => (
          <li key={c.author_github_login} className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">@{c.author_github_login}</span>
            <span className="text-[var(--text-dim)]">
              {c.ai_assisted_commit_count}/{c.commit_count} AI-disclosed ({c.ai_assisted_pct}%)
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-[var(--text-dim)]">{data.method_note}</p>
    </div>
  );
}
