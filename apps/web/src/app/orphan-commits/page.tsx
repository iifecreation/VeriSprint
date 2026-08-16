"use client";

import { useEffect, useState } from "react";
import { api, type OrphanCommit } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";

/** Orphan Commit Detector (spec Section 5.6) — real work with no linked ticket. */
export default function OrphanCommitsPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [commits, setCommits] = useState<OrphanCommit[]>([]);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!repoId) return;
    setCommits(await api.listOrphanCommits(repoId));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  async function handleDetect() {
    if (!repoId) return;
    setBusy(true);
    try {
      await api.detectOrphans(repoId);
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(commitId: string) {
    const key = linkInputs[commitId];
    if (!key?.trim()) return;
    await api.linkOrphanCommit(commitId, key.trim());
    await refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Orphan Commits</h1>
          <p className="mt-1 text-sm text-gray-500">Real work shipped with no linked ticket — link it, or leave it as-is.</p>
        </div>
        <div className="flex items-center gap-2">
          <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
          <button onClick={handleDetect} disabled={!repoId || busy} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-50">
            {busy ? "Scanning…" : "Scan for orphans"}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {commits.length === 0 && <p className="text-sm text-gray-500">No orphan commits found (or none scanned yet).</p>}
        {commits.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-gray-500">{c.sha.slice(0, 7)}</p>
                <p className="mt-1 text-sm text-gray-900">{c.message.split("\n")[0]}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  @{c.author_github_login} · {new Date(c.committed_at).toLocaleDateString()} · {c.files_changed} file(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="w-28 rounded-md border border-gray-300 px-2 py-1 text-xs"
                  placeholder="ENG-123"
                  value={linkInputs[c.id] ?? ""}
                  onChange={(e) => setLinkInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
                />
                <button onClick={() => handleLink(c.id)} className="rounded-md bg-gray-900 px-3 py-1 text-xs font-medium text-white">
                  Link
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
