"use client";

import { forwardRef, useRef } from "react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { GitBranch, MessageCircle, Ticket, Siren, CreditCard } from "lucide-react";

const Node = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(function Node(
  { children, className = "" },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`z-10 flex items-center justify-center rounded-full border bg-[var(--surface)] shadow-sm ${className}`}
    >
      {children}
    </div>
  );
});

/**
 * A real Animated Beam diagram (Magic UI) — GitHub feeding VeriSprint's
 * analysis engine, which fans out to where the results actually go: Slack
 * digests, ticket sync (Jira/Linear), the Blocker Nudge Bot's PagerDuty/
 * Datadog alerts, and Stripe billing. Generic icons + text labels rather
 * than recreated brand marks — this shows the real data flow honestly
 * without implying an official partnership with any of them.
 */
export function IntegrationBeams() {
  const containerRef = useRef<HTMLDivElement>(null);
  const githubRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const slackRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const billingRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative mx-auto flex h-[340px] w-full max-w-3xl items-center justify-between px-4">
      <div className="flex flex-col items-center gap-2">
        <Node ref={githubRef} className="h-16 w-16 border-[var(--line)] text-[var(--text-muted)]">
          <GitBranch className="h-7 w-7" strokeWidth={1.75} />
        </Node>
        <span className="text-xs font-semibold text-[var(--text-dim)]">GitHub</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Node ref={centerRef} className="h-20 w-20 border-[var(--accent-neon)]/40 bg-brand text-[#04201f] shadow-[0_0_30px_rgba(79,184,196,0.35)]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-9 w-9">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </Node>
        <span className="text-xs font-semibold text-[var(--text-muted)]">VeriSprint</span>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-4">
        <div className="flex items-center gap-2">
          <Node ref={slackRef} className="h-12 w-12 border-[var(--line)] text-[var(--accent-neon)]">
            <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
          </Node>
          <span className="text-xs font-semibold text-[var(--text-dim)]">Slack digests</span>
        </div>
        <div className="flex items-center gap-2">
          <Node ref={ticketRef} className="h-12 w-12 border-[var(--line)] text-[var(--accent-neon)]">
            <Ticket className="h-5 w-5" strokeWidth={1.75} />
          </Node>
          <span className="text-xs font-semibold text-[var(--text-dim)]">Jira / Linear</span>
        </div>
        <div className="flex items-center gap-2">
          <Node ref={alertRef} className="h-12 w-12 border-[var(--line)] text-[var(--accent-neon)]">
            <Siren className="h-5 w-5" strokeWidth={1.75} />
          </Node>
          <span className="text-xs font-semibold text-[var(--text-dim)]">PagerDuty / Datadog</span>
        </div>
        <div className="flex items-center gap-2">
          <Node ref={billingRef} className="h-12 w-12 border-[var(--line)] text-[var(--accent-neon)]">
            <CreditCard className="h-5 w-5" strokeWidth={1.75} />
          </Node>
          <span className="text-xs font-semibold text-[var(--text-dim)]">Stripe billing</span>
        </div>
      </div>

      <AnimatedBeam containerRef={containerRef} fromRef={githubRef} toRef={centerRef} duration={4} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={slackRef} curvature={-40} duration={4.5} delay={0.4} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={ticketRef} curvature={-10} duration={4.5} delay={0.8} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={alertRef} curvature={10} duration={4.5} delay={1.2} />
      <AnimatedBeam containerRef={containerRef} fromRef={centerRef} toRef={billingRef} curvature={40} duration={4.5} delay={1.6} />
    </div>
  );
}
