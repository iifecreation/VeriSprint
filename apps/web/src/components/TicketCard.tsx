import type { Ticket } from "@/lib/api";
import { ConfidenceBadge } from "./ConfidenceBadge";

const FLAG_LABEL: Record<Ticket["flags"][number]["flag_type"], string> = {
  claimed_not_shipped: "Claimed, not shipped?",
  shipped_not_claimed: "Shipped, not claimed?",
  low_confidence: "Low confidence",
  ticket_drift: "Scope drift?",
  orphan_commit: "Orphan commit",
  anomaly_activity_drop: "Check-in suggested",
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-500">{ticket.key}</span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{ticket.status}</span>
          </div>
          <h3 className="mt-1 font-medium text-gray-900">{ticket.title}</h3>
          {ticket.assignee_github_login && (
            <p className="mt-0.5 text-xs text-gray-500">@{ticket.assignee_github_login}</p>
          )}
        </div>
        <ConfidenceBadge score={ticket.confidence?.score ?? null} />
      </div>

      {ticket.confidence && (
        <p className="mt-3 rounded-md bg-gray-50 p-2.5 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Evidence Ledger: </span>
          {ticket.confidence.rationale}
        </p>
      )}

      {ticket.flags.length > 0 && (
        <ul className="mt-3 space-y-2">
          {ticket.flags.map((flag) => (
            <li
              key={flag.id}
              className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                {FLAG_LABEL[flag.flag_type]}
              </span>
              <span>{flag.question}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
