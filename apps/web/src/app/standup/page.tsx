"use client";

import { useState } from "react";
import { api, type StandupUpdate } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";

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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900">Auto-drafted standups</h1>
      <p className="mt-1 text-sm text-gray-500">
        One person, one day, generated straight from that day&apos;s analyzed commits — no
        typing required.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-xs text-gray-500">Repo</label>
          <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">GitHub username</label>
          <input
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={githubLogin}
            onChange={(e) => setGithubLogin(e.target.value)}
            placeholder="octocat"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Date</label>
          <input
            type="date"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={!repoId || !githubLogin || status === "generating"}
          className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "generating" ? "Generating…" : "Generate"}
        </button>
        <button
          onClick={refresh}
          disabled={!repoId}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {status === "error" && (
        <p className="mt-3 text-sm text-rose-600">Couldn&apos;t reach the API to generate a standup.</p>
      )}

      <div className="mt-6 space-y-4">
        {standups.length === 0 && (
          <p className="text-sm text-gray-500">
            No standup drafted for this person/day yet — generate one, or it wasn&apos;t needed
            because they had no commits that day.
          </p>
        )}
        {standups.map((s) => (
          <div key={s.id} className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800">
            {s.draft_text}
          </div>
        ))}
      </div>
    </div>
  );
}
