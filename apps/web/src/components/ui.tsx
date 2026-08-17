import type { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", glass = false }: { children: ReactNode; className?: string; glass?: boolean }) {
  return (
    <div className={`rounded-2xl ${glass ? "glass-card" : "border border-slate-200 bg-white"} p-6 transition-all ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, accent = false, hint }: { label: string; value: string | number; accent?: boolean; hint?: string }) {
  return (
    <Card className={accent ? "ring-1 ring-[var(--accent-neon)]/40" : ""}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent ? "text-[#65a30d]" : "text-slate-900"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "danger" | "warning" | "brand" }) {
  const toneClass = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-100 text-emerald-700",
    danger: "bg-rose-100 text-rose-700",
    warning: "bg-amber-100 text-amber-700",
    brand: "bg-[var(--accent-neon)]/20 text-[#3f6212]",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}>{children}</span>;
}

export function PrimaryButton({
  children,
  onClick,
  href,
  type = "button",
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  const cls = `inline-flex items-center justify-center rounded-full bg-[var(--accent-neon)] px-5 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-[var(--accent-neon-hover)] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-sm ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  href,
  className = "",
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  disabled?: boolean;
}) {
  const cls = `inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white ${className}`;
  if (href) {
    // Anchor elements have no `disabled` attribute — fall back to inert styling + no-op.
    return disabled ? (
      <span className={`${cls} cursor-not-allowed opacity-50`}>{children}</span>
    ) : (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent-neon-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-neon)]/30 ${props.className ?? ""}`}
    />
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {body && <p className="mt-1 text-sm text-slate-500">{body}</p>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--accent-neon)]" />
      Loading…
    </div>
  );
}

export function CheckIcon() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-neon)]/20 text-[#65a30d]">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}
