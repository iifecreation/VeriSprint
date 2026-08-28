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
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-[var(--text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", glass = false }: { children: ReactNode; className?: string; glass?: boolean }) {
  return (
    <div className={`rounded-2xl ${glass ? "glass-card" : "border border-[var(--line)] bg-[var(--surface)]"} p-6 transition-all ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, accent = false, hint }: { label: string; value: string | number; accent?: boolean; hint?: string }) {
  return (
    <Card className={accent ? "ring-1 ring-[var(--accent-neon)]/40" : ""}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent ? "text-brand" : "text-[var(--foreground)]"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-dim)]">{hint}</p>}
    </Card>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "danger" | "warning" | "brand" }) {
  const toneClass = {
    default: "bg-[var(--surface-raised)] text-[var(--text-muted)]",
    success: "bg-emerald-500/15 text-emerald-400",
    danger: "bg-rose-500/15 text-rose-400",
    warning: "bg-amber-500/15 text-amber-400",
    brand: "bg-[var(--accent-neon)]/20 text-brand",
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
  const cls = `inline-flex items-center justify-center rounded-full bg-[var(--accent-neon)] px-5 py-2.5 text-sm font-bold text-[#04201f] transition-all hover:bg-[var(--accent-neon-hover)] hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-sm ${className}`;
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
  const cls = `inline-flex items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50 disabled:hover:bg-[var(--surface)] ${className}`;
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
      className={`inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-raised)] ${className}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-neon-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-neon)]/30 ${props.className ?? ""}`}
    />
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)]/50 p-10 text-center">
      <p className="font-semibold text-[var(--foreground)]">{title}</p>
      {body && <p className="mt-1 text-sm text-[var(--text-muted)]">{body}</p>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--accent-neon)]" />
      Loading…
    </div>
  );
}

export function CheckIcon() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-neon)]/20 text-brand">
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
