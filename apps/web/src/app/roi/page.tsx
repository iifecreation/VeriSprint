"use client";

import { useEffect, useState } from "react";
import { api, type ROISummary } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";

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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Time-Saved / ROI</h1>
        <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Real standup meetings avoided via async reports — never a guessed dollar figure unless an hourly rate is configured in Settings.
      </p>

      <div className="mt-6 flex gap-3">
        <input type="date" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="date" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      {summary && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Card label="Team report days" value={summary.team_report_days} />
          <Card label="People covered" value={summary.people_covered} />
          <Card label="Hours saved" value={summary.hours_saved} />
          <Card label="Dollars saved" value={summary.dollars_saved !== null ? `$${summary.dollars_saved.toLocaleString()}` : "Set a rate in Settings"} />
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
