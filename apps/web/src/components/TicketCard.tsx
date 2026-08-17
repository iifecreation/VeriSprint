import type { Ticket } from "@/lib/api";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { Card } from "./ui";

const FLAG_LABEL: Record<Ticket["flags"][number]["flag_type"], string> = {
  claimed_not_shipped: "Claimed, not shipped?",
  shipped_not_claimed: "Shipped, not claimed?",
  low_confidence: "Low confidence",
  ticket_drift: "Scope drift?",
  orphan_commit: "Orphan commit",
  anomaly_activity_drop: "Check-in suggested",
  possible_blocker: "Possible blocker",
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{ticket.key}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{ticket.status}</span>
          </div>
          <h3 className="mt-1.5 font-semibold text-slate-900">{ticket.title}</h3>
          {ticket.assignee_github_login && (
            <p className="mt-0.5 text-xs text-slate-500">@{ticket.assignee_github_login}</p>
          )}
        </div>
        <ConfidenceBadge score={ticket.confidence?.score ?? null} />
      </div>

      {ticket.confidence && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Evidence Ledger: </span>
          {ticket.confidence.rationale}
        </p>
      )}

      {ticket.flags.length > 0 && (
        <ul className="mt-3 space-y-2">
          {ticket.flags.map((flag) => (
            <li
              key={flag.id}
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            >
              <span className="mt-0.5 shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                {FLAG_LABEL[flag.flag_type]}
              </span>
              <span>{flag.question}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
