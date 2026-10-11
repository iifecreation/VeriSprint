"use client";

import { useEffect, useState } from "react";
import { api, type AdminSystemMetric } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, StatCard, Badge, Select } from "@/components/ui";
import {
  Activity,
  Server,
  Zap,
  RefreshCw,
} from "lucide-react";

function Sparkline({ points }: { points: AdminSystemMetric[] }) {
  const chronological = [...points].reverse();
  const values = chronological.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <div className="mt-4 flex h-14 items-end gap-1 p-2 rounded-xl border border-[var(--line)] bg-[var(--background)]/80">
      {chronological.map((p) => {
        const heightPct = ((p.value - min) / range) * 100;
        return (
          <div
            key={p.id}
            title={`${p.value} at ${new Date(p.recorded_at).toLocaleTimeString()}`}
            className="flex-1 rounded-sm bg-brand/40 hover:bg-brand transition-colors cursor-pointer group relative"
            style={{ height: `${Math.max(heightPct, 8)}%` }}
          />
        );
      })}
    </div>
  );
}

export default function SystemMetricsPage() {
  const [metrics, setMetrics] = useState<AdminSystemMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminListMetrics(selectedMetric !== "all" ? selectedMetric : undefined)
      .then(setMetrics)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load telemetry metrics from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [selectedMetric]);

  const byName = metrics.reduce<Record<string, AdminSystemMetric[]>>((acc, m) => {
    (acc[m.metric_name] ??= []).push(m);
    return acc;
  }, {});

  const totalSamples = metrics.length;
  const latencyMetrics = metrics.filter((m) => m.metric_name === "api_latency" || m.metric_name.includes("latency"));
  const avgLatency =
    latencyMetrics.length > 0
      ? (latencyMetrics.reduce((s, m) => s + m.value, 0) / latencyMetrics.length).toFixed(1)
      : "—";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="System Telemetry & Health"
        description="Low-latency timeseries feed capturing API latencies, worker job runtimes, webhook processing, and AI token consumption."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--text-dim)]">Total: {metrics.length} telemetry points</span>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Samples" value={loading ? "…" : totalSamples} icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Avg Latency" value={loading ? "…" : avgLatency === "—" ? "—" : `${avgLatency} ms`} icon={<Server className="h-4 w-4" />} />
        <StatCard label="Telemetry Streams" value={loading ? "…" : Object.keys(byName).length} accent icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Node Status" value="Healthy" sublabel="Production cluster" />
      </div>

      {/* Metric Breakdown Cards */}
      {Object.keys(byName).length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(byName).map(([name, points]) => {
            const latest = points[0];
            const avg = (points.reduce((s, p) => s + p.value, 0) / points.length).toFixed(1);
            return (
              <Card key={name} className="p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[var(--foreground)]">{name}</span>
                  <Badge variant="default">{points.length} samples</Badge>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[var(--foreground)]">{latest.value}</span>
                  <span className="text-xs text-[var(--text-dim)]">avg: {avg}</span>
                </div>
                <Sparkline points={points} />
              </Card>
            );
          })}
        </div>
      )}

      {/* Filter and Raw Data Feed */}
      <Card>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-bold text-sm text-[var(--foreground)]">Raw Telemetry Records</h3>
          <Select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Metric Types</option>
            <option value="webhook_event">Webhook Events</option>
            <option value="api_latency">API Latency</option>
            <option value="worker_job">Worker Jobs</option>
            <option value="ai_token_usage">AI Token Usage</option>
          </Select>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-[var(--text-dim)]">
            Querying telemetry records from server…
          </div>
        ) : metrics.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--text-dim)]">
            No system metrics recorded yet. Metrics stream automatically as traffic hits the platform.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-[var(--line)] bg-[var(--surface)]/60 text-[10px] uppercase text-[var(--text-dim)]">
                <tr>
                  <th className="px-4 py-3">Metric Name</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Workspace</th>
                  <th className="px-4 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {metrics.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--surface)]/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[var(--foreground)]">{m.metric_name}</td>
                    <td className="px-4 py-3 text-brand">{m.value}</td>
                    <td className="px-4 py-3 text-[var(--text-dim)]">{m.workspace_id ? m.workspace_id.slice(0, 8) + "…" : "global"}</td>
                    <td className="px-4 py-3 text-right text-[var(--text-dim)] text-[11px]">
                      {new Date(m.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
