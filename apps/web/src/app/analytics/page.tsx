"use client";

import { useEffect, useState } from "react";
import {
  api,
  type AllocationReport,
  type CapitalizationReport,
  type ChangelogDay,
  type ContributionReport,
  type ValueStreamReport,
} from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { useAccessTokenClaims } from "@/lib/auth";
import { Card, Input, LoadingState, PageHeader } from "@/components/ui";

const FLAG_KEYS = ["value_stream_view", "cost_capitalization", "investment_allocation", "visual_changelog", "ai_contribution_tracker"];

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
        <p className="mt-8 text-sm text-slate-400">Loading…</p>
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
        </div>
      )}
    </div>
  );
}

function Panel({ title, enabled, children }: { title: string; enabled: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {enabled ? (
        children
      ) : (
        <p className="mt-2 text-xs text-slate-400">Not enabled for your workspace — a Super Admin can turn this on from the Operator Console.</p>
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
  if (data.stages.length === 0) return <p className="mt-2 text-sm text-slate-400">No tracked status transitions in this period yet.</p>;

  return (
    <div className="mt-3">
      <p className="text-xs text-slate-400">{data.tracked_ticket_count} ticket(s) with tracked transitions.</p>
      <ul className="mt-3 space-y-2">
        {data.stages.map((s) => (
          <li key={s.status} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="font-medium text-slate-700">{s.status}</span>
            <span className="text-slate-500">{s.avg_hours}h avg · {s.sample_count} sample(s)</span>
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
          <li key={e.category} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <p className="font-medium text-slate-700">{e.category === "capitalizable_new_development" ? "Capitalizable new development" : "Non-capitalizable maintenance"}</p>
            <p className="text-slate-500">
              {e.estimated_hours}h est. · {e.commit_count} commit(s) · {e.ticket_count} ticket(s)
              {e.estimated_cost_usd !== null && <> · ${e.estimated_cost_usd.toLocaleString()}</>}
            </p>
          </li>
        ))}
      </ul>
      {data.hourly_rate_usd === null && (
        <p className="mt-2 text-xs text-slate-400">Set an hourly rate in Settings to see dollar figures.</p>
      )}
      <p className="mt-3 text-xs text-slate-400">{data.method_note}</p>
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
  if (data.by_repo.length === 0) return <p className="mt-2 text-sm text-slate-400">No commit activity in this period yet.</p>;

  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">By repo</p>
        <ul className="mt-2 space-y-1.5">
          {data.by_repo.map((e) => (
            <li key={e.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">{e.label}</span>
              <span className="text-slate-500">{e.pct_of_commits}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">By person</p>
        <ul className="mt-2 space-y-1.5">
          {data.by_person.map((e) => (
            <li key={e.label} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">@{e.label}</span>
              <span className="text-slate-500">{e.pct_of_commits}%</span>
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
  if (data.length === 0) return <p className="mt-2 text-sm text-slate-400">No merged PRs in this period yet.</p>;

  return (
    <div className="mt-3 space-y-4">
      {data.map((day) => (
        <div key={day.day}>
          <p className="text-xs font-semibold text-slate-500">
            {new Date(day.day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — {day.merged_pr_count} merged, {day.commit_count} commit(s)
          </p>
          <ul className="mt-1 space-y-1">
            {day.entries.map((e) => (
              <li key={e} className="text-sm text-slate-700">{e}</li>
            ))}
          </ul>
        </div>
      ))}
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
  if (data.contributors.length === 0) return <p className="mt-2 text-sm text-slate-400">No commits in this period yet.</p>;

  return (
    <div className="mt-3">
      <ul className="space-y-1.5">
        {data.contributors.map((c) => (
          <li key={c.author_github_login} className="flex items-center justify-between text-sm">
            <span className="text-slate-700">@{c.author_github_login}</span>
            <span className="text-slate-500">
              {c.ai_assisted_commit_count}/{c.commit_count} AI-disclosed ({c.ai_assisted_pct}%)
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-400">{data.method_note}</p>
    </div>
  );
}
