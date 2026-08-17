"use client";

import { useEffect, useState } from "react";
import { api, type AuditLogEntry } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Card, EmptyState, PageHeader, SecondaryButton } from "@/components/ui";

/** Compliance & Audit Trail mode (spec Section 5.12) — every state change, timestamped and exportable. */
export default function AuditPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (repoId) api.listAuditLog(repoId).then(setEntries);
  }, [repoId]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        title="Audit Log"
        subtitle="Every meaningful state change, append-only and exportable — for regulated-industry compliance."
        actions={
          <div className="flex items-center gap-2">
            <RepoPicker selectedRepoId={repoId} onChange={setRepoId} />
            {repoId && <SecondaryButton href={api.auditExportUrl(repoId)}>Export CSV</SecondaryButton>}
          </div>
        }
      />

      <div className="mt-8 space-y-2">
        {entries.map((e) => (
          <Card key={e.id} className="py-3.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{e.action}</span>
              <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {e.actor} · {e.entity_type} {e.entity_id.slice(0, 8)}
            </p>
          </Card>
        ))}
        {entries.length === 0 && repoId && <EmptyState title="No audit entries for this repo yet" />}
      </div>
    </div>
  );
}
