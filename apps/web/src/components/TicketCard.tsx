"use client";

import { useState } from "react";
import { api, type ImpactMapEntry, type Ticket } from "@/lib/api";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Card, GhostButton, SecondaryButton } from "./ui";

const FLAG_LABEL: Record<Ticket["flags"][number]["flag_type"], string> = {
  claimed_not_shipped: "Claimed, not shipped?",
  shipped_not_claimed: "Shipped, not claimed?",
  low_confidence: "Low confidence",
  ticket_drift: "Scope drift?",
  orphan_commit: "Orphan commit",
  anomaly_activity_drop: "Check-in suggested",
  possible_blocker: "Possible blocker",
};

const STATUS_OPTIONS = ["todo", "in_progress", "in_review", "done"] as const;

export function TicketCard({ ticket, onUpdated }: { ticket: Ticket; onUpdated?: (updated: Ticket) => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [impactMap, setImpactMap] = useState<ImpactMapEntry[] | null>(null);
  const [impactMapOpen, setImpactMapOpen] = useState(false);
  const [driftStatus, setDriftStatus] = useState<"idle" | "checking" | "queued">("idle");
  const [driftError, setDriftError] = useState<string | null>(null);
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [criteriaDraft, setCriteriaDraft] = useState(ticket.acceptance_criteria ?? "");
  const [savingCriteria, setSavingCriteria] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setSavingStatus(true);
    try {
      const updated = await api.updateTicket(ticket.id, { status: newStatus });
      onUpdated?.(updated);
    } finally {
      setSavingStatus(false);
    }
  }

  async function toggleImpactMap() {
    if (!impactMapOpen && impactMap === null) {
      setImpactMap(await api.getImpactMap(ticket.id));
    }
    setImpactMapOpen((open) => !open);
  }

  async function handleDetectDrift() {
    setDriftStatus("checking");
    setDriftError(null);
    try {
      await api.detectDrift(ticket.id);
      setDriftStatus("queued");
      setTimeout(() => setDriftStatus("idle"), 3000);
    } catch {
      // Most common cause: this ticket has no acceptance_criteria yet — drift
      // detection compares current work against it, so there's nothing to
      // compare without one. Not a generic failure, so say so specifically.
      setDriftError(
        ticket.acceptance_criteria
          ? "Couldn't queue a drift check — try again in a moment."
          : "This ticket has no acceptance criteria yet — add one below, then try again.",
      );
      setDriftStatus("idle");
    }
  }

  async function handleSaveCriteria() {
    setSavingCriteria(true);
    try {
      const updated = await api.updateTicket(ticket.id, { acceptance_criteria: criteriaDraft.trim() || null });
      onUpdated?.(updated);
      setCriteriaOpen(false);
      setDriftError(null);
    } finally {
      setSavingCriteria(false);
    }
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--text-dim)]">{ticket.key}</span>
            <select
              value={status}
              disabled={savingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)] disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
          <h3 className="mt-1.5 font-semibold text-[var(--foreground)]">{ticket.title}</h3>
          {ticket.assignee_github_login && (
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">@{ticket.assignee_github_login}</p>
          )}
        </div>
        <ConfidenceBadge score={ticket.confidence?.score ?? null} />
      </div>

      {ticket.confidence && (
        <p className="mt-4 rounded-xl bg-[var(--background)] p-3 text-sm text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--foreground)]">Evidence Ledger: </span>
          {ticket.confidence.rationale}
        </p>
      )}

      {ticket.flags.length > 0 && (
        <ul className="mt-3 space-y-2">
          {ticket.flags.map((flag) => (
            <li
              key={flag.id}
              className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 p-3 text-sm text-amber-400"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {FLAG_LABEL[flag.flag_type]}
              </span>
              <span>{flag.question}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
        <GhostButton onClick={toggleImpactMap}>{impactMapOpen ? "Hide impact map" : "View impact map"}</GhostButton>
        <GhostButton onClick={handleDetectDrift} className={driftStatus !== "idle" ? "opacity-60" : ""}>
          {driftStatus === "checking" ? "Checking…" : driftStatus === "queued" ? "Queued ✓" : "Re-check for drift"}
        </GhostButton>
        <GhostButton onClick={() => setCriteriaOpen((open) => !open)}>
          {ticket.acceptance_criteria ? "Edit acceptance criteria" : "+ Add acceptance criteria"}
        </GhostButton>
      </div>

      {driftError && <p className="mt-2 text-xs text-rose-600">{driftError}</p>}

      {impactMapOpen && (
        <div className="mt-3 space-y-1.5">
          {impactMap && impactMap.length === 0 && <p className="text-xs text-[var(--text-dim)]">No cross-file evidence yet for this ticket.</p>}
          {impactMap?.map((entry) => (
            <div key={entry.file_path} className="flex items-center justify-between rounded-lg bg-[var(--background)] px-3 py-1.5 text-xs">
              <span className="font-mono text-[var(--text-muted)]">{entry.file_path}</span>
              <span className="text-[var(--text-dim)]">{entry.evidence_count} evidence item(s) · {entry.kinds.join(", ")}</span>
            </div>
          ))}
        </div>
      )}

      {criteriaOpen ? (
        <div className="mt-3 space-y-2">
          <textarea
            className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent-neon-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-neon)]/30"
            rows={3}
            value={criteriaDraft}
            onChange={(e) => setCriteriaDraft(e.target.value)}
            placeholder="e.g. Login form validates email format and shows an inline error; a failed login never redirects."
          />
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={handleSaveCriteria} disabled={savingCriteria} className="px-3 py-1.5 text-xs">
              {savingCriteria ? "Saving…" : "Save"}
            </SecondaryButton>
            <GhostButton onClick={() => { setCriteriaOpen(false); setCriteriaDraft(ticket.acceptance_criteria ?? ""); }}>Cancel</GhostButton>
          </div>
        </div>
      ) : (
        ticket.acceptance_criteria && (
          <p className="mt-3 text-xs text-[var(--text-dim)]">
            <span className="font-semibold text-[var(--text-muted)]">Acceptance criteria: </span>
            {ticket.acceptance_criteria}
          </p>
        )
      )}
    </Card>
  );
}
