"use client";

import { useEffect, useState } from "react";
import { api, errorMessage, type OrphanCommit } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Card, EmptyState, Input, PageHeader, SecondaryButton } from "@/components/ui";

/** Orphan Commit Detector (spec Section 5.6) — real work with no linked ticket. */
export default function OrphanCommitsPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [commits, setCommits] = useState<OrphanCommit[]>([]);
  const [linkInputs, setLinkInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function refresh() {
    if (!repoId) return;
    setCommits(await api.listOrphanCommits(repoId));
  }

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  async function handleDetect() {
    if (!repoId) return;
    setBusy(true);
    setNotice(null);
    try {
      await api.detectOrphans(repoId);
      setNotice({ kind: "ok", text: "Scan started — results appear here in a minute or two. Refresh to check." });
    } catch (e) {
      setNotice({ kind: "error", text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(commitId: string) {
    const key = linkInputs[commitId];
    if (!key?.trim()) return;
    setNotice(null);
    try {
      await api.linkOrphanCommit(commitId, key.trim());
      await refresh();
    } catch (e) {
      setNotice({ kind: "error", text: `Couldn't link that commit: ${errorMessage(e)}` });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader
        title="Orphan Commits"
        subtitle="Real work shipped with no linked ticket — link it, or leave it as-is."
        actions={
          <div className="flex items-center gap-2">
            <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
            <SecondaryButton disabled={!repoId || busy} onClick={handleDetect}>
              {busy ? "Scanning…" : "Scan for orphans"}
            </SecondaryButton>
          </div>
        }
      />

      {notice && (
        <p className={`mt-4 text-sm ${notice.kind === "error" ? "text-rose-600" : "text-[var(--text-muted)]"}`}>{notice.text}</p>
      )}

      <div className="mt-8 space-y-3">
        {commits.length === 0 && <EmptyState title="No orphan commits found" body="Or none scanned yet." />}
        {commits.map((c) => (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-[var(--text-dim)]">{c.sha.slice(0, 7)}</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{c.message.split("\n")[0]}</p>
                <p className="mt-0.5 text-xs text-[var(--text-dim)]">
                  @{c.author_github_login} · {new Date(c.committed_at).toLocaleDateString()} · {c.files_changed} file(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-28"
                  placeholder="ENG-123"
                  value={linkInputs[c.id] ?? ""}
                  onChange={(e) => setLinkInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
                />
                <button
                  onClick={() => handleLink(c.id)}
                  className="rounded-full bg-[var(--accent-neon)] px-4 py-2 text-xs font-bold text-[#04201f] transition-colors hover:bg-[var(--accent-neon-hover)]"
                >
                  Link
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
