import type { ReactNode } from "react";
import Link from "next/link";

export function Section({
  children,
  className = "",
  variant = "default",
  innerClassName,
  background,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "sky" | "dark";
  /** Overrides the default `py-20 sm:py-28` on the inner wrapper — for a
   * section (like the hero) that needs to own its own exact vertical rhythm
   * instead of stacking on top of the standard section padding. */
  innerClassName?: string;
  background?: ReactNode;
}) {
  const bgClass =
    variant === "sky"
      ? "bg-sky-gradient"
      : variant === "dark"
      ? "bg-dark-section"
      : "bg-[var(--background)]";
  return (
    <section className={`relative overflow-hidden ${bgClass} ${className}`}>
      {background}
      <div className={`mx-auto max-w-7xl px-6 relative z-10 ${innerClassName ?? "py-20 sm:py-28"}`}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="inline-flex items-center rounded-full bg-brand/20 px-4 py-1.5 text-xs font-mono font-semibold text-[var(--accent-neon)] ring-1 ring-[var(--accent-neon)]/30 ring-inset mb-6 uppercase tracking-wider">
      {children}
    </p>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-4 pt-0 text-center relative z-20">
      <h1 className="text-5xl font-bold tracking-tight text-[var(--foreground)] sm:text-7xl !leading-tight">
        {title}
      </h1>
      {subtitle && <p className="mx-auto mt-6 max-w-2xl text-xl text-[var(--text-muted)] leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = "", glass = false }: { children: ReactNode; className?: string; glass?: boolean }) {
  return (
    <div className={`rounded-xl ${glass ? "glass-card" : "border border-[var(--line)] bg-[var(--surface)]"} p-8 transition-all hover:border-[var(--accent-neon)]/25 hover:shadow-md ${className}`}>
      {children}
    </div>
  );
}

export function CheckIcon() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-neon)]/20 text-brand shrink-0">
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

export function PrimaryButton({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-lg bg-brand px-8 py-3.5 text-base font-semibold text-[#04201f] transition-colors hover:bg-[var(--accent-neon-hover)] shadow-sm ${className}`}
    >
      {children}
    </Link>
  );
}

export function SecondaryButton({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-8 py-3.5 text-base font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-raised)] shadow-sm ${className}`}
    >
      {children}
    </Link>
  );
}

/** Plain `<details>`-based accordion — no client JS needed, works in a
 * server component, and gets free keyboard/accessibility behavior from the
 * native element instead of reimplementing it. */
export function FAQItem({ question, answer }: { question: string; answer: ReactNode }) {
  return (
    <details className="group border-b border-[var(--line)] py-6 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-[var(--foreground)]">
        {question}
        <span className="shrink-0 text-2xl text-[var(--text-dim)] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--text-muted)]">{answer}</div>
    </details>
  );
}

export function FAQSection({ items }: { items: { question: string; answer: ReactNode }[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      {items.map((item) => (
        <FAQItem key={item.question} question={item.question} answer={item.answer} />
      ))}
    </div>
  );
}

/** A small trust/compliance badge row — text-only, deliberately not styled
 * as a formal certification seal, since VeriSprint doesn't hold SOC 2 etc.
 * yet (see /security). Overstating this here would contradict that page. */
export function TrustBadgeRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-[var(--text-muted)]">
      {items.map((item) => (
        <span key={item} className="inline-flex items-center gap-2">
          <CheckIcon />
          {item}
        </span>
      ))}
    </div>
  );
}
