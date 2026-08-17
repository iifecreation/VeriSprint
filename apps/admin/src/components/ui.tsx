import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass-card rounded-2xl p-6 transition-all hover:border-white/20 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <Card className={accent ? "ring-1 ring-[var(--accent-neon)]/30" : ""}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent ? "text-[var(--accent-neon)]" : "text-white"}`}>{value}</p>
    </Card>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "danger" | "warning" }) {
  const toneClass = {
    default: "bg-white/10 text-slate-300",
    success: "bg-emerald-500/15 text-emerald-400",
    danger: "bg-rose-500/15 text-rose-400",
    warning: "bg-amber-500/15 text-amber-400",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full bg-[var(--accent-neon)] px-5 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-[var(--accent-neon-hover)] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[var(--accent-neon)] focus:outline-none ${props.className ?? ""}`}
    />
  );
}
