"use client";

import { useEffect, useState } from "react";
import { api, type PRAutoRouteResult, type PullRequest } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Badge, Card, EmptyState, PageHeader, PrimaryButton } from "@/components/ui";

/**
 * PR AutoRoute (Phase 3 competitor-parity): suggests reviewers for a PR based
 * on real, recent commit history touching the same files — not a guess at
 * expertise. Gated behind the `pr_autoroute` feature flag.
 */
export default function ReviewersPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [result, setResult] = useState<PRAutoRouteResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    api.resolvedFeatureFlags(["pr_autoroute"]).then((r) => setEnabled(r.flags.pr_autoroute ?? false));
  }, []);

  useEffect(() => {
    if (!repoId || !enabled) return;
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setPrs([]);
      setSelectedPrId(null);
      setResult(null);
      api.listPullRequests(repoId).then((data) => {
        setPrs(data);
        if (data.length > 0) setSelectedPrId(data[0].id);
      });
    });
  }, [repoId, enabled]);

  async function handleSuggest() {
    if (!selectedPrId) return;
    setStatus("loading");
    try {
      setResult(await api.suggestReviewers(selectedPrId));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  const selectedPr = prs.find((p) => p.id === selectedPrId) ?? null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        title="PR AutoRoute"
        subtitle="Reviewer suggestions from real commit history in the same files — who else has actually worked here, not a guess at expertise."
        actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />}
      />

      {enabled === false && (
        <Card className="mt-8">
          <p className="text-sm text-[var(--text-dim)]">Not enabled for your workspace — a Super Admin can turn this on from the Operator Console.</p>
        </Card>
      )}

      {enabled && (
        <>
          <Card className="mt-8 flex flex-wrap items-end gap-4">
            <div className="min-w-[280px] flex-1">
              <label className="block text-xs font-semibold text-[var(--text-dim)]">Pull request</label>
              {prs.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--text-dim)]">{repoId ? "No pull requests ingested yet for this repo." : "Pick a repo above."}</p>
              ) : (
                <select
                  className="mt-1.5 w-full rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
                  value={selectedPrId ?? ""}
                  onChange={(e) => {
                    setSelectedPrId(e.target.value);
                    setResult(null);
                  }}
                >
                  {prs.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      #{pr.number} {pr.title} ({pr.state})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <PrimaryButton onClick={handleSuggest} disabled={!selectedPrId || status === "loading"}>
              {status === "loading" ? "Suggesting…" : "Suggest reviewers"}
            </PrimaryButton>
          </Card>

          {status === "error" && <p className="mt-3 text-sm text-rose-600">Couldn&apos;t reach the API to suggest reviewers.</p>}

          {selectedPr && (
            <p className="mt-4 text-xs text-[var(--text-dim)]">
              @{selectedPr.author_github_login} opened #{selectedPr.number} on {new Date(selectedPr.opened_at).toLocaleDateString()}
              {selectedPr.linked_ticket_key && <> · linked to {selectedPr.linked_ticket_key}</>}
            </p>
          )}

          {result && (
            <div className="mt-6 space-y-4">
              <Card>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Top suggested reviewers</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.top_suggested_reviewers.length === 0 ? (
                    <p className="text-sm text-[var(--text-dim)]">No history found for this PR&apos;s files — no reviewer has touched them before.</p>
                  ) : (
                    result.top_suggested_reviewers.map((r) => (
                      <Badge key={r} tone="brand">
                        @{r}
                      </Badge>
                    ))
                  )}
                </div>
              </Card>

              {result.suggestions.length > 0 && (
                <Card>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">By file</h2>
                  <ul className="mt-3 space-y-3">
                    {result.suggestions.map((s) => (
                      <li key={s.file_path} className="rounded-xl bg-[var(--background)] p-3 text-sm">
                        <p className="font-mono text-xs text-[var(--text-dim)]">{s.file_path}</p>
                        <p className="mt-1 text-[var(--text-muted)]">
                          {s.suggested_reviewers.map((r) => `@${r}`).join(", ")}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-dim)]">{s.basis}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {!result && prs.length === 0 && repoId && (
            <div className="mt-6">
              <EmptyState title="No pull requests yet" body="PRs show up here once the GitHub App has ingested them." />
            </div>
          )}
        </>
      )}
    </div>
  );
}
