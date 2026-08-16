"use client";

import { useEffect, useState } from "react";
import { api, type AuditLogEntry } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";

/** Compliance & Audit Trail mode (spec Section 5.12) — every state change, timestamped and exportable. */
export default function AuditPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (repoId) api.listAuditLog(repoId).then(setEntries);
  }, [repoId]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
          <p className="mt-1 text-sm text-gray-500">Every meaningful state change, append-only and exportable — for regulated-industry compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
          {repoId && (
            <a href={api.auditExportUrl(repoId)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-900">
              Export CSV
            </a>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{e.action}</span>
              <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {e.actor} · {e.entity_type} {e.entity_id.slice(0, 8)}
            </p>
          </div>
        ))}
        {entries.length === 0 && repoId && <p className="text-sm text-gray-500">No audit entries for this repo yet.</p>}
      </div>
    </div>
  );
}
