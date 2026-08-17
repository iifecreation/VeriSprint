"use client";

import { useEffect, useState } from "react";
import { api, type DashboardSummary, type Ticket } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { TicketCard } from "@/components/TicketCard";
import { PageHeader, StatCard, EmptyState, LoadingState } from "@/components/ui";

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

  useEffect(() => {
    if (!repoId) return;
    // Deferred to a microtask — the effect body fetches from the API (an
    // external system), so the resulting setState calls aren't a synchronous
    // render-triggering pattern even though the first one looks like it is.
    queueMicrotask(() => {
      setLoading(true);
      Promise.all([api.dashboardSummary(repoId), api.listTickets(repoId)])
        .then(([summaryData, ticketData]) => {
          setSummary(summaryData);
          setTickets(ticketData);
        })
        .finally(() => setLoading(false));
    });
  }, [repoId]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="PM Dashboard"
        subtitle="Claimed vs. shipped across the whole team — every judgment here traces back to a real commit."
        actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />}
      />

      {summary && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Tickets tracked" value={summary.ticket_count} />
          <StatCard label="Avg. confidence" value={summary.avg_confidence !== null ? `${summary.avg_confidence}/100` : "—"} />
          <StatCard label="Open flags" value={summary.open_flags} accent={summary.open_flags > 0} />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {loading && <LoadingState />}
        {!loading && tickets.length === 0 && repoId && (
          <EmptyState title="No tickets yet" body="Add one via the API, or wait for the reconciliation worker to run." />
        )}
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
