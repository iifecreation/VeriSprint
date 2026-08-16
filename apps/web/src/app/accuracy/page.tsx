"use client";

import { useEffect, useState } from "react";
import { api, type AccuracyPoint } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";

/** Historical Accuracy Score (spec Phase 2) — calibration, not punishment. */
export default function AccuracyPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [points, setPoints] = useState<AccuracyPoint[]>([]);

  useEffect(() => {
    if (repoId) api.getAccuracy(repoId).then(setPoints);
  }, [repoId]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Historical Accuracy</h1>
          <p className="mt-1 text-sm text-gray-500">How often claimed progress matched shipped code, per person per month — a calibration signal, not a scorecard.</p>
        </div>
        <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2">Person</th>
              <th className="px-4 py-2">Tickets</th>
              <th className="px-4 py-2">Open flags</th>
              <th className="px-4 py-2">Avg. confidence</th>
              <th className="px-4 py-2">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{p.month}</td>
                <td className="px-4 py-2">@{p.person_github_login}</td>
                <td className="px-4 py-2">{p.tickets_completed}</td>
                <td className="px-4 py-2">{p.tickets_with_unresolved_flags}</td>
                <td className="px-4 py-2">{p.avg_confidence_score ?? "—"}</td>
                <td className="px-4 py-2 font-medium">{p.accuracy_pct}%</td>
              </tr>
            ))}
            {points.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No confidence-scored tickets with an assignee yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
