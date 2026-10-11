"use client";

import { useEffect, useState } from "react";
import { api, type DashboardSummary, type Ticket } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { TicketCard } from "@/components/TicketCard";
import { Card, EmptyState, Input, LoadingState, PageHeader, PrimaryButton, SecondaryButton, StatCard } from "@/components/ui";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/Reveal";

const STATUS_OPTIONS = ["todo", "in_progress", "in_review", "done"] as const;

/**
 * PM Dashboard — "claimed vs shipped" across the whole team. Same underlying
 * data as the Developer view (app/dev/page.tsx), just unfiltered and framed
 * as a team overview instead of "your tickets".
 */
export default function DashboardPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("todo");
  const [assignee, setAssignee] = useState("");
  const [creating, setCreating] = useState(false);

  async function refresh() {
    if (!repoId) return;
    setLoading(true);
    try {
      const [summaryData, ticketData] = await Promise.all([api.dashboardSummary(repoId), api.listTickets(repoId)]);
      setSummary(summaryData);
      setTickets(ticketData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!repoId) return;
    // Deferred to a microtask — the effect body fetches from the API (an
    // external system), so the resulting setState calls aren't a synchronous
    // render-triggering pattern even though the first one looks like it is.
    queueMicrotask(() => {
      refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  async function handleCreate() {
    if (!repoId || !key.trim() || !title.trim()) return;
    setCreating(true);
    try {
      await api.createTicket({
        repo_id: repoId,
        key: key.trim(),
        title: title.trim(),
        status,
        assignee_github_login: assignee.trim() || undefined,
      });
      setKey("");
      setTitle("");
      setAssignee("");
      setStatus("todo");
      setFormOpen(false);
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  function handleTicketUpdated(updated: Ticket) {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="PM Dashboard"
        subtitle="Claimed vs. shipped across the whole team — every judgment here traces back to a real commit."
        actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />}
      />

      {summary && (
        <StaggerGroup className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StaggerItem><StatCard label="Tickets tracked" value={summary.ticket_count} /></StaggerItem>
          <StaggerItem><StatCard label="Avg. confidence" value={summary.avg_confidence !== null ? `${summary.avg_confidence}/100` : "—"} /></StaggerItem>
          <StaggerItem><StatCard label="Open flags" value={summary.open_flags} accent={summary.open_flags > 0} /></StaggerItem>
        </StaggerGroup>
      )}

      {repoId && (
        <div className="mt-8">
          {!formOpen ? (
            <SecondaryButton onClick={() => setFormOpen(true)} disabled={!repoId}>+ New ticket</SecondaryButton>
          ) : (
            <Card className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-dim)]">Key</label>
                <Input className="mt-1.5" value={key} onChange={(e) => setKey(e.target.value)} placeholder="ENG-101" />
              </div>
              <div className="min-w-[220px] flex-1">
                <label className="block text-xs font-semibold text-[var(--text-dim)]">Title</label>
                <Input className="mt-1.5 w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add login flow" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-dim)]">Status</label>
                <select
                  className="mt-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-dim)]">Assignee (optional)</label>
                <Input className="mt-1.5" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="octocat" />
              </div>
              <PrimaryButton onClick={handleCreate} disabled={!key.trim() || !title.trim() || creating}>
                {creating ? "Creating…" : "Create ticket"}
              </PrimaryButton>
              <SecondaryButton onClick={() => setFormOpen(false)}>Cancel</SecondaryButton>
            </Card>
          )}
        </div>
      )}

      <div className="mt-8">
        {loading && <LoadingState />}
        {!loading && tickets.length === 0 && repoId && (
          <FadeIn>
            <EmptyState title="No tickets yet" body="Create one above, connect Jira/Linear, or wait for the reconciliation worker to pick up linked commits." />
          </FadeIn>
        )}
        <StaggerGroup className="space-y-4">
          {tickets.map((ticket) => (
            <StaggerItem key={ticket.id}>
              <TicketCard ticket={ticket} onUpdated={handleTicketUpdated} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </div>
  );
}
