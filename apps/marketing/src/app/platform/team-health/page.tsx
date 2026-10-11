import type { Metadata } from "next";
import Link from "next/link";
import { Section, PageHeader, FAQSection, SecondaryButton } from "@/components/ui";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { HeroBackground } from "@/components/HeroBackground";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { PlatformSubNav, PlatformPagination } from "@/components/PlatformNav";
import { INSTALL_URL } from "@/lib/config";
import {
  HeartHandshake,
  ScrollText,
  Lock,
  Smile,
  ShieldCheck,
  CheckCircle2,
  Users,
  Activity,
  Moon,
  Clock,
  Sparkles,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Team Health — VeriSprint Platform",
  description:
    "Genuinely anonymous pulse surveys correlated with real delivery metrics, living working agreements, and burnout indicators that preserve engineering culture.",
};

const WORKING_AGREEMENTS = [
  {
    name: "PR Size Under 400 LOC",
    target: "< 400 lines",
    actual: "89% of PRs meet target",
    status: "Good",
    statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    desc: "Small PRs get reviewed 3.2x faster with 50% fewer production rollbacks.",
  },
  {
    name: "Review Turnaround SLA",
    target: "< 4 business hours",
    actual: "94% pickup rate",
    status: "Elite",
    statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    desc: "First review comment provided promptly to prevent PR staleness and context decay.",
  },
  {
    name: "Protected Focus Fridays",
    target: "Zero deploys after 4 PM",
    actual: "98% compliance",
    status: "Elite",
    statusColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    desc: "No risky production changes entering the weekend, protecting on-call engineering sanity.",
  },
  {
    name: "Integration Test Requirement",
    target: "All new public routes",
    actual: "92% verified in AST",
    status: "Good",
    statusColor: "text-brand bg-brand/10 border-brand/30",
    desc: "Enforced via the Evidence Ledger; highlights uncovered API routes automatically.",
  },
];

export default function TeamHealthPage() {
  return (
    <>
      <PlatformSubNav />

      {/* Hero */}
      <Section
        variant="default"
        className="bg-[var(--background)] pb-20 border-b border-[var(--line)] relative overflow-hidden"
        background={
          <>
            <HeroBackground />
            <DotPattern className="opacity-35" />
          </>
        }
      >
        <div className="mx-auto max-w-4xl text-center relative z-20">
          <p className="inline-flex items-center rounded-full bg-brand/15 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-neon)] ring-1 ring-[var(--accent-neon)]/30 mb-6">
            Product 5 of 6 — Culture & Developer Experience
          </p>
          <PageHeader
            title="Team Health"
            subtitle="Developer experience signals correlated with real delivery data, and team norms that track themselves instead of living in a dusty wiki nobody reads."
          />

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Survey Privacy Guarantee</span>
            <p className="text-5xl font-bold font-mono text-[var(--foreground)] mt-2">100%</p>
            <p className="mt-2 text-sm text-[var(--text-dim)] leading-snug">
              Anonymous — no survey response is ever traceable to an individual, even in audit logs.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-base px-8 py-3">
                Setup Working Agreements
              </ShimmerButton>
            </Link>
            <SecondaryButton href="#pulse-surveys">Explore Anonymous Pulse ↓</SecondaryButton>
          </div>
        </div>
      </Section>

      {/* Anonymous Pulse Surveys */}
      <Section variant="sky" id="pulse-surveys" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Psychological Safety</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Cryptographically Anonymous Pulse Surveys
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Engineers only give honest feedback when they know it cannot be weaponized. VeriSprint enforces mathematical k-anonymity across all developer experience surveys.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--line)] gap-4">
            <div>
              <span className="text-xs font-mono text-[var(--text-dim)] uppercase">Bi-Weekly Developer Pulse</span>
              <h3 className="text-xl font-bold text-[var(--foreground)] mt-1">Platform Engineering Squad (14 Responses)</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold">
                k-Anonymity Verified (n ≥ 5)
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            {/* Question 1 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-[var(--foreground)]">Is local CI build latency blocking your daily flow?</span>
                <span className="text-rose-400 font-mono">72% Friction Reported</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[var(--background)] overflow-hidden flex">
                <div className="h-full bg-rose-400" style={{ width: "72%" }} />
                <div className="h-full bg-emerald-400" style={{ width: "28%" }} />
              </div>
              <span className="text-[11px] text-[var(--text-dim)] mt-1 block">
                Correlated with 48-minute GitHub Actions test execution in backend service.
              </span>
            </div>

            {/* Question 2 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-[var(--foreground)]">Do you have sufficient blocks of uninterrupted focus time?</span>
                <span className="text-amber-400 font-mono">54% Adequate</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[var(--background)] overflow-hidden flex">
                <div className="h-full bg-emerald-400" style={{ width: "54%" }} />
                <div className="h-full bg-amber-400" style={{ width: "46%" }} />
              </div>
              <span className="text-[11px] text-[var(--text-dim)] mt-1 block">
                Correlated with meeting overload on Tuesdays and Thursdays.
              </span>
            </div>

            {/* Question 3 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-[var(--foreground)]">Do you feel psychologically safe discussing technical roadblocks?</span>
                <span className="text-emerald-400 font-mono">92% Strongly Agree</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[var(--background)] overflow-hidden flex">
                <div className="h-full bg-emerald-400" style={{ width: "92%" }} />
                <div className="h-full bg-brand" style={{ width: "8%" }} />
              </div>
              <span className="text-[11px] text-[var(--text-dim)] mt-1 block">
                High team safety score correlates with constructive standup reconciliation.
              </span>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-4 flex items-center gap-3 text-xs text-[var(--text-dim)]">
            <Lock className="h-4 w-4 text-brand shrink-0" />
            <span>Zero user ID, email, or IP address stored. Responses are severed from identities before persistence.</span>
          </div>
        </div>
      </Section>

      {/* Living Working Agreements */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Self-Monitoring Norms</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Living Working Agreements
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Team-authored engineering standards that monitor themselves. When an agreement drifts, the team sees it together in the sprint retro, not via a manager reprimand.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
          {WORKING_AGREEMENTS.map((wa) => (
            <div
              key={wa.name}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-[var(--text-dim)] uppercase">Target: {wa.target}</span>
                  <span className={`text-xs font-mono font-bold border rounded-md px-2 py-0.5 ${wa.statusColor}`}>
                    {wa.status}
                  </span>
                </div>
                <h4 className="text-base font-bold text-[var(--foreground)]">{wa.name}</h4>
                <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">{wa.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-dim)]">Live Metric:</span>
                <span className="text-brand font-bold">{wa.actual}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Wellbeing & Burnout Signals */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Sustainable Pace</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Wellbeing &amp; Workload Balance
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Spot burnout indicators early — late-night commit spikes, weekend activity, and excessive context switching across repos.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-4">
              <Moon className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Off-Hours Activity</h4>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Detects unusual surges in midnight or weekend commits, gently suggesting check-ins framed around team wellbeing.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Focus Time Blocks</h4>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Monitors uninterrupted coding periods between calendar events to safeguard deep engineering flow states.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Activity className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Context Switching Index</h4>
            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Flags when an engineer is juggling 4+ active repositories simultaneously, reducing cognitive overload.
            </p>
          </div>
        </div>
      </Section>

      {/* Feature Grid */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Feature Lineup</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Everything in Team Health
          </h2>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Pulse Surveys</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Short, genuinely anonymous developer-experience check-ins — no response is ever traceable back to an individual.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <ScrollText className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Working Agreements</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Team-authored norms — PR size limits, review SLAs — written by the team and tracked automatically.
            </p>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Common Questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            About Team Health
          </h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Can an admin see who submitted a specific survey answer?",
                answer:
                  "No. VeriSprint enforces strict anonymity at the database schema level. The survey submission table does not contain a user ID, email address, or IP. Results are only displayed if a minimum cohort of 5 engineers have responded.",
              },
              {
                question: "Can teams define custom working agreements?",
                answer:
                  "Yes. While we provide standard industry templates (PR size caps, review turnaround times), teams can create custom agreements evaluated against any Evidence Ledger or git metric.",
              },
              {
                question: "Does Team Health send notifications to HR or management?",
                answer:
                  "No. Wellbeing nudges and pulse results are shared within the squad itself to facilitate retro discussions, never forwarded to HR as disciplinary reports.",
              },
            ]}
          />
        </Reveal>
      </Section>

      <PlatformPagination currentSlug="team-health" />

      {/* CTA */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
            Protect Engineering Sanity and High Standards
          </h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">
            Empower your team with living working agreements and anonymous developer pulse surveys.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-lg px-8 py-2">
                Get Started Free
              </ShimmerButton>
            </Link>
            <Link href="/pricing" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              Explore Pricing Plans →
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
