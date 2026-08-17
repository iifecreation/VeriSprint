"use client";

import { useEffect, useState } from "react";
import { api, type ROISummary } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Input, PageHeader, StatCard } from "@/components/ui";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Async Standup Replacement ROI / Time-Saved Calculator (spec Section 5.4). */
export default function RoiPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [start, setStart] = useState(daysAgoISO(30));
  const [end, setEnd] = useState(todayISO());
  const [summary, setSummary] = useState<ROISummary | null>(null);

  useEffect(() => {
    if (repoId) api.getRoi(repoId, `${start}T00:00:00Z`, `${end}T23:59:59Z`).then(setSummary);
  }, [repoId, start, end]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <PageHeader
        title="Time-Saved / ROI"
        subtitle="Real standup meetings avoided via async reports — never a guessed dollar figure unless an hourly rate is configured in Settings."
        actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />}
      />

      <div className="mt-8 flex gap-3">
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      {summary && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <StatCard label="Team report days" value={summary.team_report_days} />
          <StatCard label="People covered" value={summary.people_covered} />
          <StatCard label="Hours saved" value={summary.hours_saved} />
          <StatCard
            label="Dollars saved"
            value={summary.dollars_saved !== null ? `$${summary.dollars_saved.toLocaleString()}` : "Set a rate in Settings"}
            accent={summary.dollars_saved !== null}
          />
        </div>
      )}
    </div>
  );
}
