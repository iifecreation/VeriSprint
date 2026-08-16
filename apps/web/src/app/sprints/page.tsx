"use client";

import { useEffect, useState } from "react";
import { api, type Burndown, type Sprint } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Sprints + Confidence-Weighted Burndown (spec Section 5.7). */
export default function SprintsPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [burndown, setBurndown] = useState<Burndown | null>(null);

  const [name, setName] = useState("");
  const [start, setStart] = useState(daysAgoISO(14));
  const [end, setEnd] = useState(todayISO());
  const [ticketKeys, setTicketKeys] = useState("");

  async function refreshSprints() {
    if (!repoId) return;
    const data = await api.listSprints(repoId);
    setSprints(data);
    if (data.length > 0 && !selectedSprintId) setSelectedSprintId(data[0].id);
  }

  useEffect(() => {
    refreshSprints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  useEffect(() => {
    if (selectedSprintId) api.getBurndown(selectedSprintId).then(setBurndown);
  }, [selectedSprintId]);

  async function handleCreate() {
    if (!repoId || !name.trim()) return;
    const sprint = await api.createSprint({
      repo_id: repoId,
      name: name.trim(),
      start_date: `${start}T00:00:00Z`,
      end_date: `${end}T23:59:59Z`,
      planned_ticket_keys: ticketKeys.split(",").map((k) => k.trim()).filter(Boolean),
    });
    setName("");
    setTicketKeys("");
    await refreshSprints();
    setSelectedSprintId(sprint.id);
  }

  const maxWeighted = burndown ? Math.max(1, ...burndown.points.map((p) => p.planned_tickets)) : 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Sprints &amp; Burndown</h1>
        <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-xs text-gray-500">Sprint name</label>
          <input className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint 12" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Start</label>
          <input type="date" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500">End</label>
          <input type="date" className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500">Planned ticket keys (comma-separated)</label>
          <input className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" value={ticketKeys} onChange={(e) => setTicketKeys(e.target.value)} placeholder="ENG-1, ENG-2" />
        </div>
        <button onClick={handleCreate} disabled={!repoId || !name.trim()} className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          Create sprint
        </button>
      </div>

      {sprints.length > 0 && (
        <div className="mt-6">
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
            value={selectedSprintId ?? ""}
            onChange={(e) => setSelectedSprintId(e.target.value)}
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {burndown && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-medium text-gray-900">
            {burndown.sprint.name} — confidence-weighted completion (real evidence, not self-reported %)
          </h2>
          <div className="mt-4 flex items-end gap-1" style={{ height: 160 }}>
            {burndown.points.map((p) => (
              <div key={p.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${new Date(p.day).toLocaleDateString()}: ${p.confidence_weighted_complete}/${p.planned_tickets}`}>
                <div
                  className="w-full rounded-t bg-emerald-500"
                  style={{ height: `${maxWeighted ? (p.confidence_weighted_complete / maxWeighted) * 140 : 0}px` }}
                />
                <div
                  className="w-full rounded-t bg-gray-200"
                  style={{ height: `${maxWeighted ? ((p.planned_tickets - p.confidence_weighted_complete) / maxWeighted) * 140 : 0}px` }}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Green = confidence-weighted complete (sum of score/100 across planned tickets), grey = remaining. {burndown.points.length} day(s) of real data — no synthetic points for days that haven&apos;t happened yet.
          </p>
        </div>
      )}
      {sprints.length === 0 && repoId && <p className="mt-6 text-sm text-gray-500">No sprints yet — create one above.</p>}
    </div>
  );
}
