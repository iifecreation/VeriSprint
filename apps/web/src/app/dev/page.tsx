"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Ticket } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { TicketCard } from "@/components/TicketCard";
import { Input, PageHeader, EmptyState, LoadingState } from "@/components/ui";

/**
 * Developer view — same TicketOut data as the PM dashboard, filtered to
 * "your tickets" and framed personally rather than as a team-wide report.
 */
export default function DeveloperViewPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [githubLogin, setGithubLogin] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setLoading(true);
      api
        .listTickets(repoId)
        .then(setTickets)
        .finally(() => setLoading(false));
    });
  }, [repoId]);

  const myTickets = useMemo(
    () =>
      githubLogin
        ? tickets.filter((t) => t.assignee_github_login?.toLowerCase() === githubLogin.toLowerCase())
        : tickets,
    [tickets, githubLogin],
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Your tickets"
        subtitle="What your recent commits show for the tickets assigned to you — including anything worth double-checking before standup."
        actions={
          <div className="flex items-center gap-3">
            <Input placeholder="Your GitHub username" value={githubLogin} onChange={(e) => setGithubLogin(e.target.value)} />
            <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
          </div>
        }
      />

      <div className="mt-8 space-y-4">
        {loading && <LoadingState />}
        {!loading && myTickets.length === 0 && repoId && (
          <EmptyState
            title={githubLogin ? "No tickets assigned to you in this repo yet" : "Enter your GitHub username"}
            body={githubLogin ? undefined : "So we can filter down to your tickets."}
          />
        )}
        {myTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
