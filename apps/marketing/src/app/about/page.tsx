import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/config";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { HeroBackground } from "@/components/HeroBackground";
import { MagicCard } from "@/components/magicui/magic-card";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = { title: "About — VeriSprint" };

export default function AboutPage() {
  return (
    <>
      <Section
        variant="default"
        className="bg-[var(--background)] pb-16 min-h-[50vh] flex items-center border-b border-[var(--line)] relative overflow-hidden"
        background={
          <>
            <HeroBackground />
            <DotPattern className="opacity-40" />
          </>
        }
      >
        <div className="w-full relative z-10">
          <PageHeader title="Why VeriSprint exists" subtitle="The story behind building a new way to measure engineering work without the overhead." />
        </div>
      </Section>
      <Section className="pt-0 -mt-24 z-20 relative bg-transparent">
        <Reveal>
          <MagicCard className="mx-auto max-w-3xl flex flex-col h-full bg-[var(--surface)] text-lg leading-relaxed text-[var(--text-muted)] shadow-[0_0_50px_rgba(79,184,196,0.3)] mb-16">
            <h3 className="text-2xl font-bold text-[var(--foreground)] mb-4">The Trust Gap</h3>
            <p>
              Status meetings ask engineers to reconstruct, from memory, what they did — and ask managers to take that
              reconstruction on faith. Meanwhile the actual record of what happened already exists: it&apos;s sitting in
              git. VeriSprint reads that record instead of asking anyone to summarize it twice.
            </p>

            <h3 className="text-2xl font-bold text-[var(--foreground)] mt-10 mb-4">Why Now?</h3>
            <p>
              Large Language Models (LLMs) have only recently become fast, cheap, and accurate enough to reliably reason about code diffs in their full file context. Most legacy tools either summarize surface-level commit messages or report abstract metrics (cycle time, DORA) without actually judging whether the work is functionally real. That gap — contextual, code-grounded verification — is finally solvable.
            </p>

            <h3 className="text-2xl font-bold text-[var(--foreground)] mt-10 mb-4">Operational Maturity</h3>
            <p>
              VeriSprint is built for production from day one. We operate with strict tenant isolation, role-based access control (RBAC), and a dedicated platform control plane to monitor LLM queue latency, webhook delivery health, and system uptime across all workspaces. We don&apos;t just build a demo; we run a highly observable infrastructure you can trust with your engineering data.
            </p>

            <p className="mt-10 border-t border-[var(--line)] pt-10 text-[var(--text-muted)]">
              We&apos;re early — a small, independent project rather than a large company, and still adding the Phase 2
              and Phase 3 features on our roadmap. If a page here ever claims a capability that doesn&apos;t
              work as described, we&apos;d genuinely like to hear about it.
            </p>
            <div className="mt-10 rounded-2xl bg-[var(--background)] p-6 border border-[var(--line)] text-center">
              <p className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wider font-mono">Get in touch</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="mt-2 block text-xl font-bold text-[var(--accent-neon-hover)] hover:text-brand transition-colors">
                {CONTACT_EMAIL}
              </a>
            </div>
          </MagicCard>
        </Reveal>
      </Section>
    </>
  );
}
