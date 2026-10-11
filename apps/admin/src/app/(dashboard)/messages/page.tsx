"use client";

import { useEffect, useState } from "react";
import { api, type ContactMessage } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, Badge, StatCard, Select } from "@/components/ui";
import {
  Mail,
  CheckCircle2,
  Clock,
  Building,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [reasonFilter, setReasonFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminListContactMessages(includeResolved)
      .then(setMessages)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load contact inquiries from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [includeResolved]);

  async function resolveMessage(id: string) {
    try {
      await api.adminResolveContactMessage(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to resolve contact message");
    }
  }

  const filteredMessages = messages.filter((m) => {
    if (reasonFilter !== "all" && m.reason !== reasonFilter) return false;
    return true;
  });

  const openCount = messages.filter((m) => !m.resolved_at).length;
  const enterpriseCount = messages.filter((m) => m.reason === "enterprise" && !m.resolved_at).length;
  const resolvedCount = messages.filter((m) => m.resolved_at !== null).length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Inbound Inquiries"
        description="Submissions from the public marketing site contact form across enterprise, security, bug reports, and sales."
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
              title="Refresh messages"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total In Scope" value={loading ? "…" : messages.length} icon={<Mail className="h-4 w-4" />} />
        <StatCard label="Unread / Pending" value={loading ? "…" : openCount} accent={openCount > 0} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Enterprise Leads" value={loading ? "…" : enterpriseCount} accent={enterpriseCount > 0} icon={<Building className="h-4 w-4" />} />
        <StatCard label="Resolved Tickets" value={loading ? "…" : resolvedCount} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dim)]">
            <span>Filter Category:</span>
          </div>
          <Select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="text-xs"
          >
            <option value="all">All Inquiry Categories</option>
            <option value="enterprise">Enterprise Sales</option>
            <option value="security">Security & Compliance</option>
            <option value="bug_report">Bug Reports</option>
            <option value="other">General Feedback</option>
          </Select>
        </div>
      </Card>

      {/* Message List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[var(--text-dim)]">
            Loading contact inquiries from server…
          </div>
        ) : filteredMessages.length === 0 ? (
          <Card className="py-16 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400/80 mb-3" />
            <h3 className="font-bold text-base text-[var(--foreground)]">No Inquiries Found</h3>
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              {includeResolved
                ? "No contact submissions exist in the database."
                : "All incoming contact messages have been reviewed and resolved."}
            </p>
          </Card>
        ) : (
          filteredMessages.map((msg) => (
            <Card
              key={msg.id}
              className={`p-6 transition-all ${
                msg.resolved_at ? "opacity-60 bg-[var(--surface)]/20" : "bg-[var(--surface)]/40"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-bold text-sm text-[var(--foreground)]">{msg.name}</span>
                    <a
                      href={`mailto:${msg.email}`}
                      className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
                    >
                      <span>&lt;{msg.email}&gt;</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <Badge variant={msg.reason === "enterprise" ? "accent" : "default"}>
                      {msg.reason.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-[11px] text-[var(--text-dim)]">
                      {new Date(msg.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap mt-3 bg-[var(--background)]/60 rounded-xl p-4 border border-[var(--line)]/60">
                    {msg.message}
                  </p>
                </div>

                {!msg.resolved_at ? (
                  <button
                    onClick={() => resolveMessage(msg.id)}
                    className="shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Resolved</span>
                  </span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
