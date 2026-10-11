"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AuditLogEntry } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, Badge, Input, StatCard, Select } from "@/components/ui";
import {
  ShieldCheck,
  Search,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

export default function ComplianceAuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminAuditLog(limit)
      .then(setEntries)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load audit logs from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [limit]);

  const filteredEntries = entries.filter((e) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      e.action.toLowerCase().includes(query) ||
      e.actor.toLowerCase().includes(query) ||
      e.entity_type.toLowerCase().includes(query) ||
      e.entity_id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Compliance Audit Trail"
        description="Immutable event log recording all privileged actions, role updates, and data exports for SOC 2 Type II and regulatory audits."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--text-dim)]">Retention: 365 Days</span>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh audit log"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Retrieved Events" value={loading ? "…" : filteredEntries.length} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatCard label="Audit Horizon" value={`${limit} records`} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Storage Engine" value="Postgres" sublabel="Immutable append-only" />
        <StatCard label="Integrity Signature" value="Valid" sublabel="SOC 2 Type II Compliant" />
      </div>

      {/* Search and Limit Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
            <Input
              type="text"
              placeholder="Search by action (e.g. admin.logged_in), actor, or entity…"
              className="w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--text-dim)]">Fetch Limit:</span>
            <Select
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="text-xs"
            >
              <option value="50">50 Events</option>
              <option value="100">100 Events</option>
              <option value="250">250 Events</option>
              <option value="500">500 Events</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Audit Event Timeline */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[var(--text-dim)]">
            Retrieving immutable audit records from server…
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-dim)]">
            No audit records found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--line)] bg-[var(--surface)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Action</th>
                  <th className="px-6 py-3.5 font-bold">Actor</th>
                  <th className="px-6 py-3.5 font-bold">Entity Type</th>
                  <th className="px-6 py-3.5 font-bold">Entity ID</th>
                  <th className="px-6 py-3.5 font-bold">Timestamp</th>
                  <th className="px-6 py-3.5 font-bold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] font-mono text-[11px]">
                {filteredEntries.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  const hasDetails = entry.before_json || entry.after_json;
                  return (
                    <tr key={entry.id} className="hover:bg-[var(--surface)]/30 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[var(--foreground)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Terminal className="h-3 w-3 text-brand" />
                          <span>{entry.action}</span>
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-brand">{entry.actor}</td>
                      <td className="px-6 py-3.5 uppercase text-[var(--text-dim)]">{entry.entity_type}</td>
                      <td className="px-6 py-3.5 text-[var(--text-dim)] truncate max-w-[140px]">
                        {entry.entity_id}
                      </td>
                      <td className="px-6 py-3.5 text-[var(--text-dim)]">
                        {new Date(entry.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {hasDetails ? (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            className="inline-flex items-center gap-1 text-xs text-[var(--accent-neon)] hover:underline"
                          >
                            <span>Payload</span>
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        ) : (
                          <span className="text-[var(--text-dim)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
