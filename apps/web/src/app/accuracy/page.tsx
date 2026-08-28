"use client";

import { useEffect, useState } from "react";
import { api, type AccuracyPoint } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Card, PageHeader } from "@/components/ui";

/** Historical Accuracy Score (spec Phase 2) — calibration, not punishment. */
export default function AccuracyPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [points, setPoints] = useState<AccuracyPoint[]>([]);

  useEffect(() => {
    if (repoId) api.getAccuracy(repoId).then(setPoints);
  }, [repoId]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        title="Historical Accuracy"
        subtitle="How often claimed progress matched shipped code, per person per month — a calibration signal, not a scorecard."
        actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />}
      />

      <Card className="mt-8 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
              <th className="px-5 py-3">Month</th>
              <th className="px-5 py-3">Person</th>
              <th className="px-5 py-3">Tickets</th>
              <th className="px-5 py-3">Open flags</th>
              <th className="px-5 py-3">Avg. confidence</th>
              <th className="px-5 py-3">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i} className="border-b border-[var(--line)] last:border-0">
                <td className="px-5 py-3 font-mono text-xs text-[var(--text-muted)]">{p.month}</td>
                <td className="px-5 py-3 text-[var(--text-muted)]">@{p.person_github_login}</td>
                <td className="px-5 py-3 text-[var(--text-muted)]">{p.tickets_completed}</td>
                <td className="px-5 py-3 text-[var(--text-muted)]">{p.tickets_with_unresolved_flags}</td>
                <td className="px-5 py-3 text-[var(--text-muted)]">{p.avg_confidence_score ?? "—"}</td>
                <td className="px-5 py-3 font-bold text-[var(--foreground)]">{p.accuracy_pct}%</td>
              </tr>
            ))}
            {points.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-[var(--text-dim)]">
                  No confidence-scored tickets with an assignee yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
