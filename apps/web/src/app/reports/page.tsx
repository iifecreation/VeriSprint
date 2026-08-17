"use client";

import { useEffect, useState } from "react";
import { api, type ReportDocument, type Sprint } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Badge, Card, EmptyState, Input, PageHeader, SecondaryButton } from "@/components/ui";

const STATUS_TONE: Record<ReportDocument["status"], "warning" | "success" | "danger"> = {
  generating: "warning",
  ready: "success",
  failed: "danger",
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
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      refresh();
    });
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
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader title="Reports" subtitle="Every summary here is drafted from real commits and evidence — a failed generation says so, never a fabricated fallback." actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />} />

      <Card className="mt-8 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500">Period start</label>
          <Input type="date" className="mt-1.5" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500">Period end</label>
          <Input type="date" className="mt-1.5" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
        </div>
        <SecondaryButton disabled={!repoId || busy} onClick={() => withBusy(() => api.generateInvestorUpdate(repoId!, isoStart, isoEnd))}>
          Generate investor update
        </SecondaryButton>
        <SecondaryButton disabled={!repoId || busy} onClick={() => withBusy(() => api.generateClientPortalReport(repoId!, isoStart, isoEnd))}>
          Generate client portal report
        </SecondaryButton>
        <SecondaryButton disabled={!repoId || busy} onClick={() => withBusy(() => api.generateOnboardingDoc(repoId!))}>
          Generate onboarding doc
        </SecondaryButton>
        {sprints.length > 0 && (
          <SecondaryButton disabled={!repoId || busy} onClick={() => withBusy(() => api.generateSprintRollup(repoId!, sprints[0].id))}>
            Rollup for &ldquo;{sprints[0].name}&rdquo;
          </SecondaryButton>
        )}
      </Card>

      <div className="mt-8 space-y-3">
        {reports.length === 0 && <EmptyState title="No reports generated yet" />}
        {reports.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <div>
                <Badge>{r.report_type.replace(/_/g, " ")}</Badge>
                <h3 className="mt-1.5 font-semibold text-slate-900">{r.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {r.report_type === "client_portal" && r.share_token && (
                  <a href={`/portal/${r.share_token}`} target="_blank" className="text-xs font-medium text-[#3f6212] hover:underline">
                    Public link ↗
                  </a>
                )}
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
            </div>
            {r.status === "ready" && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{r.summary_text}</p>}
            {r.status === "failed" && (
              <p className="mt-3 text-sm text-rose-600">Generation failed — check the worker logs (likely a missing ANTHROPIC_API_KEY).</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
