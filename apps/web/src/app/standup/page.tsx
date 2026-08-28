"use client";

import { useState } from "react";
import { api, type StandupUpdate } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Card, EmptyState, Input, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StandupPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [githubLogin, setGithubLogin] = useState("");
  const [day, setDay] = useState(today());
  const [standups, setStandups] = useState<StandupUpdate[]>([]);
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");

  async function refresh() {
    if (!repoId) return;
    setStandups(await api.listStandups(repoId, day));
  }

  async function handleGenerate() {
    if (!repoId || !githubLogin) return;
    setStatus("generating");
    try {
      await api.generateStandup(repoId, githubLogin, day);
      // Generation runs on the background worker — give it a moment, then poll.
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await refresh();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader title="Auto-drafted standups" subtitle="One person, one day, generated straight from that day's analyzed commits — no typing required." />

      <Card className="mt-8 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Repo</label>
          <div className="mt-1.5">
            <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">GitHub username</label>
          <Input className="mt-1.5" value={githubLogin} onChange={(e) => setGithubLogin(e.target.value)} placeholder="octocat" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Date</label>
          <Input type="date" className="mt-1.5" value={day} onChange={(e) => setDay(e.target.value)} />
        </div>
        <PrimaryButton onClick={handleGenerate} disabled={!repoId || !githubLogin || status === "generating"}>
          {status === "generating" ? "Generating…" : "Generate"}
        </PrimaryButton>
        <SecondaryButton disabled={!repoId} onClick={refresh}>Refresh</SecondaryButton>
      </Card>

      {status === "error" && (
        <p className="mt-3 text-sm text-rose-600">Couldn&apos;t reach the API to generate a standup.</p>
      )}

      <div className="mt-8 space-y-4">
        {standups.length === 0 && (
          <EmptyState
            title="No standup drafted yet"
            body="Generate one, or it wasn't needed because they had no commits that day."
          />
        )}
        {standups.map((s) => (
          <Card key={s.id} className="whitespace-pre-wrap text-sm text-[var(--text-muted)]">
            {s.draft_text}
          </Card>
        ))}
      </div>
    </div>
  );
}
