"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Ticket } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { TicketCard } from "@/components/TicketCard";

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
    setLoading(true);
    api
      .listTickets(repoId)
      .then(setTickets)
      .finally(() => setLoading(false));
  }, [repoId]);

  const myTickets = useMemo(
    () =>
      githubLogin
        ? tickets.filter((t) => t.assignee_github_login?.toLowerCase() === githubLogin.toLowerCase())
        : tickets,
    [tickets, githubLogin],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Your tickets</h1>
        <div className="flex items-center gap-3">
          <input
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            placeholder="Your GitHub username"
            value={githubLogin}
            onChange={(e) => setGithubLogin(e.target.value)}
          />
          <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        Here&apos;s what your recent commits show for the tickets assigned to you — including
        anything worth double-checking before standup.
      </p>

      <div className="mt-6 space-y-4">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && myTickets.length === 0 && repoId && (
          <p className="text-sm text-gray-500">
            {githubLogin ? "No tickets assigned to you in this repo yet." : "Enter your GitHub username to filter to your tickets."}
          </p>
        )}
        {myTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
