import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  glass = true,
}: {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 transition-all ${
        glass
          ? "glass-card hover:border-[var(--accent-neon)]/30"
          : "border border-[var(--line)] bg-[var(--panel-bg)] hover:border-[var(--line-strong)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
  accent = false,
  trend,
  icon,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: boolean;
  trend?: { value: string; positive?: boolean };
  icon?: ReactNode;
}) {
  return (
    <Card className={accent ? "ring-1 ring-[var(--accent-neon)]/40 shadow-lg shadow-[var(--accent-neon)]/5" : ""}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-dim)]">{label}</p>
        {icon && (
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-[var(--accent-neon)]/15 text-[var(--accent-neon)]" : "bg-[var(--line)]/50 text-[var(--text-muted)]"}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className={`text-3xl font-bold font-mono tabular-nums tracking-tight ${accent ? "text-[var(--accent-neon)]" : "text-[var(--foreground)]"}`}>
          {value}
        </p>
        {trend && (
          <span className={`text-xs font-mono font-semibold ${trend.positive ? "text-emerald-400" : "text-rose-400"}`}>
            {trend.value}
          </span>
        )}
      </div>
      {sublabel && <p className="mt-1.5 text-xs text-[var(--text-dim)]">{sublabel}</p>}
    </Card>
  );
}

export function Badge({
  children,
  tone,
  variant,
  size = "md",
}: {
  children: ReactNode;
  tone?: "default" | "success" | "danger" | "warning" | "purple" | "blue" | "accent";
  variant?: "default" | "success" | "danger" | "warning" | "purple" | "blue" | "accent";
  size?: "sm" | "md";
}) {
  const resolvedTone = (variant || tone || "default") as string;
  const toneClass = {
    default: "bg-[var(--line)]/50 text-[var(--text-muted)] border-[var(--line)]",
    accent: "bg-[var(--accent-neon)]/10 text-[var(--accent-neon)] border-[var(--accent-neon)]/25",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  }[resolvedTone] ?? "bg-[var(--line)]/50 text-[var(--text-muted)] border-[var(--line)]";

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex items-center font-mono font-medium rounded-full border ${sizeClass} ${toneClass}`}>
      {children}
    </span>
  );
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-neon)] px-5 py-2.5 text-sm font-bold text-[#04201f] transition-all hover:bg-[var(--accent-neon-hover)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 shadow-md shadow-[var(--accent-neon)]/10 cursor-pointer disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)]/60 px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-all hover:border-[var(--accent-neon)]/40 hover:bg-[var(--line)]/50 active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  onClick,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-400 transition-all hover:bg-rose-500/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-xl border border-[var(--line)] bg-[var(--panel-bg)]/80 px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-neon)] focus:ring-1 focus:ring-[var(--accent-neon)]/30 focus:outline-none transition-all ${
        props.className ?? ""
      }`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-xl border border-[var(--line)] bg-[var(--panel-bg)]/80 px-3.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent-neon)] focus:ring-1 focus:ring-[var(--accent-neon)]/30 focus:outline-none transition-all ${
        props.className ?? ""
      }`}
    >
      {props.children}
    </select>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin text-current ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
