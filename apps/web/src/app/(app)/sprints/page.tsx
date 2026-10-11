"use client";

import { useEffect, useState } from "react";
import { api, type Burndown, type DeliveryAccuracyReport, type DeliveryForecast, type Sprint } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Badge, Card, EmptyState, Input, LoadingState, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";

const RISK_QUADRANT_LABELS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "brand" }> = {
  on_track: { label: "On track", tone: "success" },
  capacity_mismatch: { label: "Capacity mismatch", tone: "warning" },
  scope_creep: { label: "Scope creep", tone: "warning" },
  overcommitted: { label: "Overcommitted", tone: "danger" },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Sprints + Confidence-Weighted Burndown (spec Section 5.7). */
export default function SprintsPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [burndown, setBurndown] = useState<Burndown | null>(null);
  const [forecast, setForecast] = useState<DeliveryForecast | null>(null);
  const [forecastStatus, setForecastStatus] = useState<"idle" | "loading" | "error">("idle");
  const [forecastEnabled, setForecastEnabled] = useState<boolean | null>(null);
  const [accuracy, setAccuracy] = useState<DeliveryAccuracyReport | null>(null);
  const [accuracyStatus, setAccuracyStatus] = useState<"idle" | "loading" | "error">("idle");
  const [accuracyEnabled, setAccuracyEnabled] = useState<boolean | null>(null);

  const [name, setName] = useState("");
  const [start, setStart] = useState(daysAgoISO(14));
  const [end, setEnd] = useState(todayISO());
  const [ticketKeys, setTicketKeys] = useState("");

  async function refreshSprints() {
    if (!repoId) return;
    const data = await api.listSprints(repoId);
    setSprints(data);
    if (data.length > 0 && !selectedSprintId) setSelectedSprintId(data[0].id);
  }

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      refreshSprints();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      if (selectedSprintId) api.getBurndown(selectedSprintId).then(setBurndown);
      setForecast(null);
      setAccuracy(null);
    });
  }, [selectedSprintId]);

  useEffect(() => {
    api.resolvedFeatureFlags(["delivery_forecast", "delivery_accuracy"]).then((r) => {
      setForecastEnabled(r.flags.delivery_forecast ?? false);
      setAccuracyEnabled(r.flags.delivery_accuracy ?? false);
    });
  }, []);

  async function handleForecast() {
    if (!selectedSprintId) return;
    setForecastStatus("loading");
    try {
      setForecast(await api.getDeliveryForecast(selectedSprintId));
      setForecastStatus("idle");
    } catch {
      setForecastStatus("error");
    }
  }

  async function handleAccuracy() {
    if (!selectedSprintId) return;
    setAccuracyStatus("loading");
    try {
      setAccuracy(await api.getDeliveryAccuracy(selectedSprintId));
      setAccuracyStatus("idle");
    } catch {
      setAccuracyStatus("error");
    }
  }

  async function handleCreate() {
    if (!repoId || !name.trim()) return;
    const sprint = await api.createSprint({
      repo_id: repoId,
      name: name.trim(),
      start_date: `${start}T00:00:00Z`,
      end_date: `${end}T23:59:59Z`,
      planned_ticket_keys: ticketKeys.split(",").map((k) => k.trim()).filter(Boolean),
    });
    setName("");
    setTicketKeys("");
    await refreshSprints();
    setSelectedSprintId(sprint.id);
  }

  const maxWeighted = burndown ? Math.max(1, ...burndown.points.map((p) => p.planned_tickets)) : 1;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader title="Sprints & Burndown" subtitle="A burndown built from real Confidence Score history — never a self-reported percentage." actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />} />

      <Card className="mt-8 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Sprint name</label>
          <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 12" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Start</label>
          <Input type="date" className="mt-1.5" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">End</label>
          <Input type="date" className="mt-1.5" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Planned ticket keys (comma-separated)</label>
          <Input className="mt-1.5 w-full" value={ticketKeys} onChange={(e) => setTicketKeys(e.target.value)} placeholder="ENG-1, ENG-2" />
        </div>
        <PrimaryButton onClick={handleCreate} disabled={!repoId || !name.trim()}>
          Create sprint
        </PrimaryButton>
      </Card>

      {sprints.length > 0 && (
        <div className="mt-6">
          <select
            className="rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
            value={selectedSprintId ?? ""}
            onChange={(e) => setSelectedSprintId(e.target.value)}
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {burndown && (
        <Card className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            {burndown.sprint.name} — confidence-weighted completion (real evidence, not self-reported %)
          </h2>
          <div className="mt-6 flex items-end gap-1.5" style={{ height: 160 }}>
            {burndown.points.map((p) => (
              <div
                key={p.day}
                className="flex flex-1 flex-col items-center justify-end gap-1"
                title={`${new Date(p.day).toLocaleDateString()}: ${p.confidence_weighted_complete}/${p.planned_tickets}`}
              >
                <div
                  className="w-full rounded-t-md bg-[var(--accent-neon-hover)]"
                  style={{ height: `${maxWeighted ? (p.confidence_weighted_complete / maxWeighted) * 140 : 0}px` }}
                />
                <div
                  className="w-full rounded-t-md bg-[var(--line)]"
                  style={{ height: `${maxWeighted ? ((p.planned_tickets - p.confidence_weighted_complete) / maxWeighted) * 140 : 0}px` }}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-[var(--text-dim)]">
            Green = confidence-weighted complete (sum of score/100 across planned tickets), grey = remaining. {burndown.points.length} day(s) of real
            data — no synthetic points for days that haven&apos;t happened yet.
          </p>
        </Card>
      )}

      {selectedSprintId && forecastEnabled && (
        <Card className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Delivery forecast</h2>
            <SecondaryButton onClick={handleForecast} disabled={forecastStatus === "loading"}>
              {forecastStatus === "loading" ? "Projecting…" : forecast ? "Refresh" : "Project completion"}
            </SecondaryButton>
          </div>
          {forecastStatus === "error" && <p className="mt-2 text-sm text-rose-600">Couldn&apos;t reach the API to project this sprint.</p>}
          {forecastStatus === "loading" && <div className="mt-3"><LoadingState /></div>}
          {forecast && (
            <div className="mt-3 space-y-1 text-sm text-[var(--text-muted)]">
              <p>
                {forecast.current_confidence_weighted_complete.toFixed(1)} / {forecast.planned_tickets} confidence-weighted complete so far
                {forecast.velocity_per_day !== null && <> · {forecast.velocity_per_day}/day velocity</>}
              </p>
              {forecast.projected_completion_date ? (
                <p className="font-semibold text-[var(--foreground)]">
                  Projected completion: {new Date(forecast.projected_completion_date).toLocaleDateString()}
                </p>
              ) : (
                forecast.projection_note && <p className="text-[var(--text-dim)]">{forecast.projection_note}</p>
              )}
              <p className="mt-2 text-xs text-[var(--text-dim)]">{forecast.method}</p>
            </div>
          )}
        </Card>
      )}

      {selectedSprintId && accuracyEnabled && (
        <Card className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Planning &amp; Capacity Accuracy</h2>
            <SecondaryButton onClick={handleAccuracy} disabled={accuracyStatus === "loading"}>
              {accuracyStatus === "loading" ? "Computing…" : accuracy ? "Refresh" : "Compute"}
            </SecondaryButton>
          </div>
          {accuracyStatus === "error" && <p className="mt-2 text-sm text-rose-600">Couldn&apos;t reach the API to compute accuracy for this sprint.</p>}
          {accuracyStatus === "loading" && <div className="mt-3"><LoadingState /></div>}
          {accuracy && (
            <div className="mt-3 space-y-3">
              {accuracy.risk_quadrant && (
                <Badge tone={RISK_QUADRANT_LABELS[accuracy.risk_quadrant].tone}>
                  {RISK_QUADRANT_LABELS[accuracy.risk_quadrant].label}
                </Badge>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-dim)]">Planning accuracy</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {accuracy.planning_accuracy.value ?? "—"}% {accuracy.planning_accuracy.band && `(${accuracy.planning_accuracy.band.replace("_", " ")})`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-dim)]">Capacity accuracy</span>
                <span className="font-semibold text-[var(--foreground)]">
                  {accuracy.capacity_accuracy.value ?? "—"}% {accuracy.capacity_accuracy.band && `(${accuracy.capacity_accuracy.band.replace("_", " ")})`}
                </span>
              </div>
              <p className="text-xs text-[var(--text-dim)]">
                {accuracy.planned_completed_count} of {accuracy.planned_ticket_count} planned tickets done, plus{" "}
                {accuracy.added_completed_count} unplanned — {accuracy.total_completed_count} total completed in this sprint&apos;s window.
              </p>
              <p className="text-xs text-[var(--text-dim)]">{accuracy.method_note}</p>
            </div>
          )}
        </Card>
      )}

      {sprints.length === 0 && repoId && (
        <div className="mt-6">
          <EmptyState title="No sprints yet" body="Create one above." />
        </div>
      )}
    </div>
  );
}
