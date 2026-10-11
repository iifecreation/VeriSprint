"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminErrorEvent } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, Badge, Input, GhostButton, StatCard, Select } from "@/components/ui";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Search,
  Terminal,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

export default function ErrorsObservabilityPage() {
  const [errors, setErrors] = useState<AdminErrorEvent[]>([]);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminListErrors(includeResolved)
      .then(setErrors)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load error events from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [includeResolved]);

  async function resolveError(id: string) {
    try {
      await api.adminResolveError(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to resolve error event");
    }
  }

  const filteredErrors = errors.filter((e) => {
    if (severityFilter !== "all" && e.severity !== severityFilter) return false;
    if (search && !e.message.toLowerCase().includes(search.toLowerCase()) && !e.source.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const criticalCount = errors.filter((e) => e.severity === "critical" && !e.resolved_at).length;
  const errorCount = errors.filter((e) => e.severity === "error" && !e.resolved_at).length;
  const resolvedCount = errors.filter((e) => e.resolved_at !== null).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Errors & Observability"
        description="System telemetry, worker exceptions, and webhook failures across all cluster nodes."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIncludeResolved(!includeResolved)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                includeResolved
                  ? "border-[var(--accent-neon)]/50 bg-[var(--accent-neon)]/15 text-[var(--accent-neon)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {includeResolved ? "Showing All (Inc. Resolved)" : "Showing Unresolved Only"}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh error events"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total In Scope" value={loading ? "…" : errors.length} icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Critical Severity" value={loading ? "…" : criticalCount} accent={criticalCount > 0} icon={<ShieldAlert className="h-4 w-4" />} />
        <StatCard label="Standard Errors" value={loading ? "…" : errorCount} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Resolved Exceptions" value={loading ? "…" : resolvedCount} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
            <Input
              type="text"
              placeholder="Search exceptions by source or message…"
              className="w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="error">Error Only</option>
              <option value="warning">Warning Only</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Error Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[var(--text-dim)]">
            Loading error event queue from server…
          </div>
        ) : filteredErrors.length === 0 ? (
          <Card className="py-16 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400/80 mb-3" />
            <h3 className="font-bold text-base text-[var(--foreground)]">No Matching Error Incidents</h3>
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              {includeResolved
                ? "No errors recorded in the system database."
                : "All known exceptions have been marked as resolved."}
            </p>
          </Card>
        ) : (
          filteredErrors.map((err) => {
            const isExpanded = expandedId === err.id;
            return (
              <Card
                key={err.id}
                className={`p-5 transition-all ${
                  err.resolved_at
                    ? "opacity-60 bg-[var(--surface)]/20"
                    : err.severity === "critical"
                    ? "border-rose-500/40 bg-rose-500/5"
                    : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge
                        variant={
                          err.severity === "critical"
                            ? "danger"
                            : err.severity === "error"
                            ? "warning"
                            : "default"
                        }
                      >
                        {err.severity.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-brand">{err.source}</span>
                      {err.workspace_id && (
                        <Link
                          href={`/workspaces/${err.workspace_id}`}
                          className="font-mono text-[11px] text-[var(--text-dim)] hover:underline"
                        >
                          ws:{err.workspace_id.slice(0, 8)}…
                        </Link>
                      )}
                      <span className="font-mono text-[11px] text-[var(--text-dim)]">
                        {new Date(err.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                      </span>
                      {err.resolved_at && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Resolved</span>
                        </span>
                      )}
                    </div>

                    <p className="font-mono text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap break-all">
                      {err.message}
                    </p>

                    {err.stack_ref && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : err.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent-neon)] hover:underline"
                        >
                          <Terminal className="h-3.5 w-3.5" />
                          <span>Stack Trace Reference</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 rounded-xl border border-[var(--line)] bg-[var(--background)] p-4 font-mono text-[11px] text-[var(--text-muted)] overflow-x-auto whitespace-pre">
                            {err.stack_ref}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!err.resolved_at && (
                    <button
                      onClick={() => resolveError(err.id)}
                      className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
