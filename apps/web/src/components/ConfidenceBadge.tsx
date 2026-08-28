export function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-[var(--surface-raised)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-dim)]">
        No evidence yet
      </span>
    );
  }

  const tone =
    score >= 75
      ? "bg-emerald-500/15 text-emerald-400"
      : score >= 50
        ? "bg-amber-500/15 text-amber-400"
        : "bg-rose-500/15 text-rose-400";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {score}/100 confidence
    </span>
  );
}
