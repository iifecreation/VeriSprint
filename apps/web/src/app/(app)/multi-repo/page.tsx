"use client";

import { useEffect, useState } from "react";
import { api, type LogicalWorkUnit } from "@/lib/api";
import { useAccessTokenClaims } from "@/lib/auth";
import { Badge, Card, EmptyState, LoadingState, PageHeader } from "@/components/ui";

/**
 * Multi-Repo / Monorepo Intelligence (spec Section 5.10): commits that share
 * a ticket key across more than one repo, stitched into one logical unit of
 * work instead of being reported on in isolation per-repo. Workspace-scoped
 * (spans every connected repo), not repo-scoped like most other pages here —
 * a single-repo ticket isn't multi-repo intelligence, so those never appear.
 */
export default function MultiRepoPage() {
  const workspaceId = useAccessTokenClaims()?.workspace_id ?? null;
  const [units, setUnits] = useState<LogicalWorkUnit[] | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    // Deferred to a microtask — see Sidebar.tsx for why.
    queueMicrotask(() => {
      api.listWorkUnits(workspaceId).then(setUnits);
    });
  }, [workspaceId]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        title="Multi-Repo Intelligence"
        subtitle="Work that genuinely spans more than one repo, stitched into a single unit — a ticket touched in only one repo is just a ticket, and won't show up here."
      />

      {!workspaceId && <p className="mt-8 text-sm text-[var(--text-dim)]">Sign in to a workspace to view this page.</p>}

      {workspaceId && !units && (
        <div className="mt-8">
          <LoadingState />
        </div>
      )}

      {workspaceId && units && units.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No cross-repo work yet"
            body="Nothing here until a ticket key shows up in commits across two or more connected repos — connect more than one repo and link commits to the same ticket to see it appear."
          />
        </div>
      )}

      {workspaceId && units && units.length > 0 && (
        <div className="mt-8 space-y-4">
          {units.map((unit) => (
            <Card key={unit.ticket_key}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs text-[var(--text-dim)]">{unit.ticket_key}</span>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {unit.commit_count} commit{unit.commit_count === 1 ? "" : "s"} across {unit.repo_full_names.length} repos
                  </p>
                </div>
                <Badge tone="brand">
                  {new Date(unit.first_committed_at).toLocaleDateString()} – {new Date(unit.last_committed_at).toLocaleDateString()}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {unit.repo_full_names.map((name) => (
                  <span key={name} className="rounded-full bg-[var(--surface-raised)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                    {name}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
