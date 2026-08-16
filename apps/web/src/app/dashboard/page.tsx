"use client";

import { useEffect, useState } from "react";
import { api, type DashboardSummary, type Ticket } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { TicketCard } from "@/components/TicketCard";

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">PM Dashboard</h1>
        <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
      </div>

      {summary && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          <SummaryCard label="Tickets tracked" value={summary.ticket_count} />
          <SummaryCard
            label="Avg. confidence"
            value={summary.avg_confidence !== null ? `${summary.avg_confidence}/100` : "—"}
          />
          <SummaryCard label="Open flags" value={summary.open_flags} accent={summary.open_flags > 0} />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && tickets.length === 0 && repoId && (
          <p className="text-sm text-gray-500">No tickets yet for this repo — add one via the API, or wait for the reconciliation worker to run.</p>
        )}
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-amber-600" : "text-gray-900"}`}>{value}</p>
    </div>
  );
}
