"use client";

import { useEffect, useState } from "react";
import { api, type CodeHealthSignals, type DORAMetrics, type RiskRadar, type TeamGoal } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { useAccessTokenClaims } from "@/lib/auth";
import { Card, Input, PageHeader } from "@/components/ui";

const FLAG_KEYS = ["dora_panel", "code_health_signals", "risk_radar", "team_goals"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Insights (Phase 2/3 competitor-parity): a curated view of the newer
 * feature set — DORA metrics, code health signals, risk radar, and team
 * goals. Each panel is gated by its own workspace feature flag (Operator
 * Console → Flags); off by default, so most workspaces will see the
 * "not enabled" state here until an admin turns one on.
 */
export default function InsightsPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [start, setStart] = useState(daysAgoISO(30));
  const [end, setEnd] = useState(todayISO());
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  const workspaceId = useAccessTokenClaims()?.workspace_id ?? null;

  useEffect(() => {
    api.resolvedFeatureFlags(FLAG_KEYS).then((r) => setFlags(r.flags));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Insights"
        subtitle="DORA metrics, code health, risk radar, and team goals — the competitor-parity feature set."
        actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />}
      />

      <div className="mt-6 flex gap-3">
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      {!flags ? (
        <p className="mt-8 text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Panel title="DORA Metrics" enabled={flags.dora_panel}>
            {repoId && flags.dora_panel && <DoraPanel repoId={repoId} start={start} end={end} />}
          </Panel>
          <Panel title="Code Health" enabled={flags.code_health_signals}>
            {repoId && flags.code_health_signals && <CodeHealthPanel repoId={repoId} start={start} end={end} />}
          </Panel>
          <Panel title="Risk Radar" enabled={flags.risk_radar}>
            {repoId && flags.risk_radar && <RiskPanel repoId={repoId} />}
          </Panel>
          <Panel title="Team Goals" enabled={flags.team_goals}>
            {workspaceId && flags.team_goals && <GoalsPanel workspaceId={workspaceId} />}
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

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="mt-2 flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value ?? "—"}</span>
    </div>
  );
}

function DoraPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<DORAMetrics | null>(null);
  useEffect(() => {
    api.getDora(repoId, `${start}T00:00:00Z`, `${end}T23:59:59Z`).then(setData).catch(() => setData(null));
  }, [repoId, start, end]);
  if (!data) return <p className="mt-2 text-xs text-slate-400">Loading…</p>;
  return (
    <div>
      <Stat label="Merged PRs" value={data.deployed_pr_count} />
      <Stat label="Deploys / day" value={data.deployment_frequency_per_day} />
      <Stat label="Lead time (hrs)" value={data.lead_time_for_changes_hours} />
      <p className="mt-3 text-xs text-slate-400">{data.unavailable_metrics_note}</p>
    </div>
  );
}

function CodeHealthPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<CodeHealthSignals | null>(null);
  useEffect(() => {
    api.getCodeHealth(repoId, `${start}T00:00:00Z`, `${end}T23:59:59Z`).then(setData).catch(() => setData(null));
  }, [repoId, start, end]);
  if (!data) return <p className="mt-2 text-xs text-slate-400">Loading…</p>;
  return (
    <div>
      <Stat label="Health score" value={data.health_score !== null ? `${data.health_score}%` : "Not enough evidence yet"} />
      <Stat label="Tests added" value={data.test_added_count} />
      <Stat label="Tests missing" value={data.test_missing_count} />
      <Stat label="Dead code / TODOs" value={data.dead_code_count + data.todo_count} />
    </div>
  );
}

function RiskPanel({ repoId }: { repoId: string }) {
  const [data, setData] = useState<RiskRadar | null>(null);
  useEffect(() => {
    api.getRiskRadar(repoId).then(setData).catch(() => setData(null));
  }, [repoId]);
  if (!data) return <p className="mt-2 text-xs text-slate-400">Loading…</p>;
  return (
    <div>
      <Stat label="Risk score" value={`${data.risk_score}%`} />
      <Stat label="Low-confidence tickets" value={data.low_confidence_ticket_count} />
      <Stat label="Stale in-progress tickets" value={data.stale_in_progress_ticket_count} />
      {Object.entries(data.open_flags_by_type).map(([type, count]) => (
        <Stat key={type} label={type.replace(/_/g, " ")} value={count} />
      ))}
    </div>
  );
}

function GoalsPanel({ workspaceId }: { workspaceId: string }) {
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  useEffect(() => {
    api.listTeamGoals(workspaceId).then(setGoals).catch(() => setGoals([]));
  }, [workspaceId]);
  return (
    <div>
      {goals.length === 0 && <p className="mt-2 text-xs text-slate-400">No goals set yet.</p>}
      {goals.map((g) => (
        <div key={g.id} className="mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">{g.name}</span>
            <span className="text-slate-500">
              {g.current_value ?? "—"} / {g.target_value}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-[var(--accent-neon-hover)]"
              style={{ width: `${Math.min(g.progress_pct ?? 0, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
