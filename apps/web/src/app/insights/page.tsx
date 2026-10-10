"use client";

import { useEffect, useState } from "react";
import {
  api,
  type BenchmarkedValue,
  type CodeHealthSignals,
  type DORAMetrics,
  type EfficiencyReport,
  type InvestmentProfileReport,
  type RiskRadar,
  type Team,
  type TeamGoal,
} from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { useAccessTokenClaims } from "@/lib/auth";
import { Badge, Card, Input, PageHeader } from "@/components/ui";

const FLAG_KEYS = [
  "dora_panel",
  "code_health_signals",
  "risk_radar",
  "team_goals",
  "git_efficiency_metrics",
  "investment_profile",
];

const CATEGORY_LABELS: Record<string, string> = {
  new_value: "New Value",
  feature_enhancements: "Feature Enhancements",
  developer_experience: "Developer Experience",
  keeping_the_lights_on: "Keeping the Lights On",
};

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
        <p className="mt-8 text-sm text-[var(--text-dim)]">Loading…</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Panel title="DORA Metrics" enabled={flags.dora_panel}>
            {repoId && flags.dora_panel && <DoraPanel repoId={repoId} start={start} end={end} />}
          </Panel>
          <Panel title="Git Efficiency Metrics" enabled={flags.git_efficiency_metrics}>
            {repoId && flags.git_efficiency_metrics && <EfficiencyPanel repoId={repoId} start={start} end={end} />}
          </Panel>
          <Panel title="Investment Profile" enabled={flags.investment_profile}>
            {repoId && flags.investment_profile && <InvestmentProfilePanel repoId={repoId} start={start} end={end} />}
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
      <h2 className="font-semibold text-[var(--foreground)]">{title}</h2>
      {enabled ? (
        children
      ) : (
        <p className="mt-2 text-xs text-[var(--text-dim)]">Not enabled for your workspace — a Super Admin can turn this on from the Operator Console.</p>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="mt-2 flex justify-between text-sm">
      <span className="text-[var(--text-dim)]">{label}</span>
      <span className="font-semibold text-[var(--foreground)]">{value ?? "—"}</span>
    </div>
  );
}

function DoraPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<DORAMetrics | null>(null);
  useEffect(() => {
    api.getDora(repoId, `${start}T00:00:00Z`, `${end}T23:59:59Z`).then(setData).catch(() => setData(null));
  }, [repoId, start, end]);
  if (!data) return <p className="mt-2 text-xs text-[var(--text-dim)]">Loading…</p>;
  return (
    <div>
      <Stat label="Merged PRs" value={data.deployed_pr_count} />
      <Stat label="Deploys / day" value={data.deployment_frequency_per_day} />
      <Stat label="Lead time (hrs)" value={data.lead_time_for_changes_hours} />
      <p className="mt-3 text-xs text-[var(--text-dim)]">{data.unavailable_metrics_note}</p>
    </div>
  );
}

const BAND_TONE = {
  elite: "brand",
  good: "success",
  fair: "warning",
  needs_focus: "danger",
} as const;

function BenchmarkStat({ label, stat }: { label: string; stat: BenchmarkedValue }) {
  return (
    <div className="mt-2 flex items-center justify-between text-sm">
      <span className="text-[var(--text-dim)]">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-semibold text-[var(--foreground)]">
          {stat.value ?? "—"}
          {stat.value !== null && stat.unit ? ` ${stat.unit}` : ""}
        </span>
        {stat.band && <Badge tone={BAND_TONE[stat.band]}>{stat.band.replace("_", " ")}</Badge>}
      </span>
    </div>
  );
}

function EfficiencyPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<EfficiencyReport | null>(null);
  const [person, setPerson] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    api.listTeams().then(setTeams).catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    const trimmed = person.trim();
    api
      .getEfficiency(repoId, `${start}T00:00:00Z`, `${end}T23:59:59Z`, trimmed || null, teamId || null)
      .then(setData)
      .catch(() => setData(null));
  }, [repoId, start, end, person, teamId]);

  return (
    <div>
      <input
        value={person}
        onChange={(e) => {
          setPerson(e.target.value);
          if (e.target.value) setTeamId("");
        }}
        placeholder="Filter by GitHub login (People segmentation)"
        className="mb-2 w-full rounded-md border border-[var(--surface-raised)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)] placeholder:text-[var(--text-dim)]"
      />
      {teams.length > 0 && (
        <select
          value={teamId}
          onChange={(e) => {
            setTeamId(e.target.value);
            if (e.target.value) setPerson("");
          }}
          className="mb-2 w-full rounded-md border border-[var(--surface-raised)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
        >
          <option value="">No team filter (Team segmentation)</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.member_github_logins.length})
            </option>
          ))}
        </select>
      )}
      {!data ? (
        <p className="mt-2 text-xs text-[var(--text-dim)]">Loading…</p>
      ) : (
        <>
      <Stat label="Merged PRs" value={data.merged_pr_count} />
      <BenchmarkStat label="PR size" stat={data.pr_size_lines} />
      <BenchmarkStat label="Coding time" stat={data.coding_time_hours} />
      <BenchmarkStat label="Pickup time" stat={data.pr_pickup_time_hours} />
      <BenchmarkStat label="Review time" stat={data.pr_review_time_hours} />
      <BenchmarkStat label="Deploy time" stat={data.deploy_time_hours} />
      <BenchmarkStat label="Cycle time" stat={data.cycle_time_hours} />
      <BenchmarkStat label="Merge frequency" stat={data.merge_frequency_per_dev_per_week} />
      <BenchmarkStat label="Rework rate" stat={data.rework_rate_pct} />
      <BenchmarkStat label="Refactor rate" stat={data.refactor_rate_pct} />
      <BenchmarkStat label="Change failure rate" stat={data.change_failure_rate_pct} />
      <BenchmarkStat label="MTTR" stat={data.mttr_hours} />
      <Stat label="Review depth (reviews/PR)" value={data.review_depth_per_pr} />
      <Stat
        label="Merged without review"
        value={data.prs_merged_without_review_pct !== null ? `${data.prs_merged_without_review_pct}%` : null}
      />
      <p className="mt-3 text-xs text-[var(--text-dim)]">{data.method_note}</p>
        </>
      )}
    </div>
  );
}

function InvestmentCategoryBar({ label, pct, targetPct }: { label: string; pct: number; targetPct: number }) {
  const overTarget = pct > targetPct;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="text-[var(--text-dim)]">
          {pct}% <span className="text-[var(--text-dim)]/70">(target {targetPct}%)</span>
        </span>
      </div>
      <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-[var(--surface-raised)]">
        <div
          className={`h-1.5 rounded-full ${overTarget ? "bg-amber-400" : "bg-[var(--accent-neon-hover)]"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
        <div className="absolute top-0 h-1.5 w-px bg-[var(--text-dim)]" style={{ left: `${Math.min(targetPct, 100)}%` }} />
      </div>
    </div>
  );
}

function InvestmentProfilePanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<InvestmentProfileReport | null>(null);
  useEffect(() => {
    api.getInvestmentProfile(repoId, `${start}T00:00:00Z`, `${end}T23:59:59Z`).then(setData).catch(() => setData(null));
  }, [repoId, start, end]);
  if (!data) return <p className="mt-2 text-xs text-[var(--text-dim)]">Loading…</p>;
  return (
    <div>
      {data.categories.map((c) => (
        <InvestmentCategoryBar
          key={c.category}
          label={CATEGORY_LABELS[c.category] ?? c.category}
          pct={c.pct_of_categorized_lines}
          targetPct={c.target_pct}
        />
      ))}
      <Stat label="Uncategorized (no/unmatched ticket)" value={`${data.uncategorized_pct_of_total}%`} />
      <Stat
        label="Inefficiency pool (rework)"
        value={data.inefficiency_pool_pct !== null ? `${data.inefficiency_pool_pct}%` : null}
      />
      <p className="mt-3 text-xs text-[var(--text-dim)]">{data.method_note}</p>
    </div>
  );
}

function CodeHealthPanel({ repoId, start, end }: { repoId: string; start: string; end: string }) {
  const [data, setData] = useState<CodeHealthSignals | null>(null);
  useEffect(() => {
    api.getCodeHealth(repoId, `${start}T00:00:00Z`, `${end}T23:59:59Z`).then(setData).catch(() => setData(null));
  }, [repoId, start, end]);
  if (!data) return <p className="mt-2 text-xs text-[var(--text-dim)]">Loading…</p>;
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
  if (!data) return <p className="mt-2 text-xs text-[var(--text-dim)]">Loading…</p>;
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

const GOAL_METRIC_KEYS = [
  "avg_confidence_score",
  "reconciliation_accuracy_pct",
  "deployment_frequency_per_day",
  "merged_pr_count",
  "pr_size_lines",
  "cycle_time_hours",
  "pr_pickup_time_hours",
  "pr_review_time_hours",
  "rework_rate_pct",
  "prs_merged_without_review_pct",
  "change_failure_rate_pct",
  "mttr_hours",
  "new_value_pct",
  "feature_enhancements_pct",
  "developer_experience_pct",
  "keeping_the_lights_on_pct",
];

function GoalRow({ goal, parentName, onDeleted }: { goal: TeamGoal; parentName?: string; onDeleted: () => void }) {
  return (
    <div className={`mt-3 ${parentName ? "ml-4 border-l border-[var(--surface-raised)] pl-3" : ""}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">
          {parentName && <span className="text-[var(--text-dim)]">↳ </span>}
          {goal.name}
        </span>
        <span className="flex items-center gap-2 text-[var(--text-dim)]">
          {goal.current_value ?? "—"} / {goal.target_value}
          {goal.is_breaching && <Badge tone="danger">off track</Badge>}
          <button onClick={onDeleted} className="text-[var(--text-dim)] hover:text-[var(--foreground)]" aria-label="Delete goal">
            ×
          </button>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--surface-raised)]">
        <div
          className={`h-1.5 rounded-full ${goal.is_breaching ? "bg-rose-400" : "bg-[var(--accent-neon-hover)]"}`}
          style={{ width: `${Math.min(goal.progress_pct ?? 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

function GoalsPanel({ workspaceId }: { workspaceId: string }) {
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [metricKey, setMetricKey] = useState(GOAL_METRIC_KEYS[0]);
  const [targetValue, setTargetValue] = useState("");
  const [parentGoalId, setParentGoalId] = useState("");
  const [periodStart, setPeriodStart] = useState(daysAgoISO(0));
  const [periodEnd, setPeriodEnd] = useState(daysAgoISO(-90));

  function reload() {
    api.listTeamGoals(workspaceId).then(setGoals).catch(() => setGoals([]));
  }
  useEffect(reload, [workspaceId]);

  async function create() {
    if (!name || !targetValue) return;
    await api.createTeamGoal({
      name,
      metric_key: metricKey,
      target_value: parseFloat(targetValue),
      period_start: `${periodStart}T00:00:00Z`,
      period_end: `${periodEnd}T23:59:59Z`,
      parent_goal_id: parentGoalId || null,
    });
    setName("");
    setTargetValue("");
    setParentGoalId("");
    setShowForm(false);
    reload();
  }

  async function remove(goalId: string) {
    await api.deleteTeamGoal(goalId);
    reload();
  }

  const topLevel = goals.filter((g) => !g.parent_goal_id);
  const childrenOf = (id: string) => goals.filter((g) => g.parent_goal_id === id);
  const goalById = Object.fromEntries(goals.map((g) => [g.id, g]));

  return (
    <div>
      {goals.length === 0 && <p className="mt-2 text-xs text-[var(--text-dim)]">No goals set yet.</p>}
      {topLevel.map((g) => (
        <div key={g.id}>
          <GoalRow goal={g} onDeleted={() => remove(g.id)} />
          {childrenOf(g.id).map((child) => (
            <GoalRow key={child.id} goal={child} parentName={g.name} onDeleted={() => remove(child.id)} />
          ))}
        </div>
      ))}
      {/* Orphaned children (parent not in this workspace's goal list, e.g. deleted) */}
      {goals
        .filter((g) => g.parent_goal_id && !goalById[g.parent_goal_id])
        .map((g) => (
          <GoalRow key={g.id} goal={g} onDeleted={() => remove(g.id)} />
        ))}

      {showForm ? (
        <div className="mt-4 space-y-2 rounded-lg border border-[var(--surface-raised)] p-3">
          <Input placeholder="Goal name" value={name} onChange={(e) => setName(e.target.value)} />
          <select
            value={metricKey}
            onChange={(e) => setMetricKey(e.target.value)}
            className="w-full rounded-md border border-[var(--surface-raised)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--foreground)]"
          >
            {GOAL_METRIC_KEYS.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <Input type="number" placeholder="Target value" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          <select
            value={parentGoalId}
            onChange={(e) => setParentGoalId(e.target.value)}
            className="w-full rounded-md border border-[var(--surface-raised)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--foreground)]"
          >
            <option value="">No parent (org-level objective)</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                Cascades from: {g.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={create}
              className="rounded-md bg-[var(--accent-neon-hover)] px-3 py-1.5 text-xs font-semibold text-[var(--background)]"
            >
              Create
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-[var(--text-dim)]">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className="mt-4 text-xs font-semibold text-[var(--accent-neon-hover)]">
          + New goal
        </button>
      )}
    </div>
  );
}
