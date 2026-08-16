"use client";

import { useEffect, useState } from "react";
import { api, type ReportDocument, type Sprint } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";

const STATUS_TONE: Record<ReportDocument["status"], string> = {
  generating: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Sprint rollups, investor updates, onboarding docs, and client portal reports — spec Sections 4/5.2/5.3/5.8. */
export default function ReportsPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [periodStart, setPeriodStart] = useState(daysAgoISO(30));
  const [periodEnd, setPeriodEnd] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!repoId) return;
    const [reportData, sprintData] = await Promise.all([api.listReports(repoId), api.listSprints(repoId)]);
    setReports(reportData);
    setSprints(sprintData);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  async function withBusy(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const isoStart = `${periodStart}T00:00:00Z`;
  const isoEnd = `${periodEnd}T23:59:59Z`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
        <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-xs text-gray-500">Period start</label>
          <input type="date" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Period end</label>
          <input type="date" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </div>
        <button
          disabled={!repoId || busy}
          onClick={() => withBusy(() => api.generateInvestorUpdate(repoId!, isoStart, isoEnd))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-50"
        >
          Generate investor update
        </button>
        <button
          disabled={!repoId || busy}
          onClick={() => withBusy(() => api.generateClientPortalReport(repoId!, isoStart, isoEnd))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-50"
        >
          Generate client portal report
        </button>
        <button
          disabled={!repoId || busy}
          onClick={() => withBusy(() => api.generateOnboardingDoc(repoId!))}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-50"
        >
          Generate onboarding doc
        </button>
        {sprints.length > 0 && (
          <button
            disabled={!repoId || busy}
            onClick={() => withBusy(() => api.generateSprintRollup(repoId!, sprints[0].id))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900 disabled:opacity-50"
          >
            Rollup for &ldquo;{sprints[0].name}&rdquo;
          </button>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {reports.length === 0 && <p className="text-sm text-gray-500">No reports generated yet.</p>}
        {reports.map((r) => (
          <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{r.report_type.replace(/_/g, " ")}</span>
                <h3 className="mt-1 font-medium text-gray-900">{r.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {r.report_type === "client_portal" && r.share_token && (
                  <a href={`/portal/${r.share_token}`} target="_blank" className="text-xs text-blue-600 hover:underline">
                    Public link ↗
                  </a>
                )}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[r.status]}`}>{r.status}</span>
              </div>
            </div>
            {r.status === "ready" && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{r.summary_text}</p>}
            {r.status === "failed" && (
              <p className="mt-2 text-sm text-rose-600">Generation failed — check the worker logs (likely a missing ANTHROPIC_API_KEY).</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
