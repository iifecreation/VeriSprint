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
  BarChart3,
  Gauge,
  Coins,
  Compass,
  Layers,
  Milestone,
  Sparkles,
  Landmark,
  FileCheck2,
  Wallet,
  TrendingUp,
  Waypoints,
  Clock,
  CheckCircle2,
  Zap,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Team Intelligence — VeriSprint Platform",
  description:
    "Engineering metrics grounded in real evidence. DORA metrics, git efficiency benchmarks, investment profiling, OKR cascades, and delivery forecasting without duplicate data pipelines.",
};

const DORA_METRICS = [
  {
    name: "Deployment Frequency",
    value: "4.2 / day",
    band: "Elite",
    bandColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    desc: "Multiple deploys per day to production, tracked from verified merge tags and CI releases.",
  },
  {
    name: "Lead Time for Changes",
    value: "14.8 hrs",
    band: "Elite",
    bandColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    desc: "Average elapsed time from first git commit to code running live in production.",
  },
  {
    name: "Change Failure Rate",
    value: "2.4%",
    band: "Elite",
    bandColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    desc: "Percentage of releases resulting in a rollback, hotfix commit, or P1 incident.",
  },
  {
    name: "Time to Restore Service",
    value: "36 mins",
    band: "Elite",
    bandColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    desc: "Mean time from incident opening to verified remediation commit deploy.",
  },
];

const CYCLE_TIME_STAGES = [
  { stage: "Coding Time", duration: "3.4h", pct: "31%", desc: "First commit to PR opened", band: "Elite" },
  { stage: "Pickup Time", duration: "1.8h", pct: "16%", desc: "PR opened to first review comment", band: "Elite" },
  { stage: "Review Time", duration: "4.2h", pct: "38%", desc: "First review to PR approval", band: "Good" },
  { stage: "Deploy Time", duration: "1.6h", pct: "15%", desc: "Approval to production merge & deploy", band: "Elite" },
];

const INVESTMENT_CATEGORIES = [
  { category: "New Value", pct: "44%", color: "bg-brand", desc: "Customer-facing net-new capabilities & revenue features" },
  { category: "Feature Enhancements", pct: "26%", color: "bg-blue-400", desc: "Iterative improvements to existing active workflows" },
  { category: "Developer Experience", pct: "18%", color: "bg-purple-400", desc: "Internal tooling, test framework speedups, CI performance" },
  { category: "KTLO & Maintenance", pct: "12%", color: "bg-amber-400", desc: "Dependency upgrades, security patches, bug fixes" },
];

export default function TeamIntelligencePage() {
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
            Product 2 of 6 — Competitor Parity & Beyond
          </p>
          <PageHeader
            title="Team Intelligence"
            subtitle="The engineering metrics Jellyfish, LinearB, and Allstacks sell — DORA, git efficiency, investment allocation, and delivery forecasting — computed from your real Evidence Ledger instead of a secondary data pipeline."
          />

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">DORA & Efficiency Grounding</span>
            <p className="text-5xl font-bold font-mono text-[var(--foreground)] mt-2">4 DORA</p>
            <p className="mt-2 text-sm text-[var(--text-dim)] leading-snug">
              Standard metrics benchmarked against your own team&apos;s history and real industry percentiles.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-base px-8 py-3">
                Unlock Team Intelligence
              </ShimmerButton>
            </Link>
            <SecondaryButton href="#dora-panel">View DORA & Benchmarks ↓</SecondaryButton>
          </div>
        </div>
      </Section>

      {/* DORA Metrics Panel */}
      <Section variant="sky" id="dora-panel" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Industry Benchmarks</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Live DORA Metrics Grounded in Commits
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Other tools calculate DORA from self-reported Jira status transitions. VeriSprint measures real release commits, deployment webhooks, and incident commits directly.
          </p>
        </Reveal>

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {DORA_METRICS.map((metric) => (
              <div
                key={metric.name}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm hover:border-brand/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-[var(--text-dim)] uppercase">DORA Metric</span>
                    <span className={`text-xs font-mono font-bold border rounded-md px-2 py-0.5 ${metric.bandColor}`}>
                      {metric.band}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">{metric.name}</h3>
                  <p className="text-3xl font-bold font-mono text-brand mt-3">{metric.value}</p>
                </div>
                <p className="mt-4 text-xs text-[var(--text-muted)] leading-relaxed pt-3 border-t border-[var(--line)]/50">
                  {metric.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* PR Cycle Time 4-Phase Waterfall */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Granular Efficiency</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            4-Stage PR Cycle Time Waterfall
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Diagnose bottlenecks where they actually happen: Coding, Pickup, Review, or Deployment. Every metric benchmarked into Elite, Good, Fair, and Needs-Focus bands.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--line)] gap-4">
            <div>
              <span className="text-xs font-mono text-[var(--text-dim)] uppercase">Rolling 30-Day Average</span>
              <h3 className="text-2xl font-bold text-[var(--foreground)] mt-1">11.0 Hours Total Cycle Time</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold">
                Elite Performance Tier (Top 10%)
              </span>
            </div>
          </div>

          {/* Visual Bar Waterfall */}
          <div className="mt-8">
            <div className="h-4 w-full rounded-full bg-[var(--background)] overflow-hidden flex">
              <div className="h-full bg-brand" style={{ width: "31%" }} title="Coding (31%)" />
              <div className="h-full bg-blue-400" style={{ width: "16%" }} title="Pickup (16%)" />
              <div className="h-full bg-purple-400" style={{ width: "38%" }} title="Review (38%)" />
              <div className="h-full bg-emerald-400" style={{ width: "15%" }} title="Deploy (15%)" />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CYCLE_TIME_STAGES.map((stage) => (
                <div key={stage.stage} className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--foreground)]">{stage.stage}</span>
                    <span className="text-xs font-mono text-brand font-bold">{stage.duration}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1">{stage.desc}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[var(--text-dim)]">
                    <span>{stage.pct} of cycle</span>
                    <span className="text-emerald-400 font-bold">{stage.band}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Investment Profile & R&D Capitalization */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Executive Alignment</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Investment Profiling & Cost Capitalization
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Know where engineering payroll actually goes: New Value vs. Feature Enhancements vs. Developer Experience vs. KTLO. Generate audit-ready ASC 350-40 reports automatically.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
          {/* Investment Profile */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">Quarterly Breakdown</span>
              <span className="text-xs font-mono text-[var(--text-dim)]">Q3 Active Sprint Cohort</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">Engineering Investment Profile</h3>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Calculated from semantic commit classifications and ticket initiatives, never subjective quarterly surveys.
            </p>

            <div className="mt-6 space-y-4">
              {INVESTMENT_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-[var(--foreground)]">{cat.category}</span>
                    <span className="font-mono text-brand font-bold">{cat.pct}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--background)] overflow-hidden">
                    <div className={`h-full ${cat.color} rounded-full`} style={{ width: cat.pct }} />
                  </div>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* R&D Cost Capitalization */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">Finance & Tax Audit</span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-mono text-brand font-semibold">
                  GAAP / IFRS Ready
                </span>
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)]">Automated Cost Capitalization</h3>
              <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                Qualify for software capitalization under ASC 350-40. Commits are mapped into Application Development Stage (capitalizable) vs Preliminary Project Stage (expensed) with full audit citations.
              </p>

              <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--background)]/70 p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Capitalizable Dev Work:</span>
                  <span className="text-emerald-400 font-bold">72.4% ($284,500)</span>
                </div>
                <div className="flex justify-between text-[var(--text-muted)]">
                  <span>Expensed Maintenance & Bug Fixes:</span>
                  <span className="text-amber-400 font-bold">27.6% ($108,400)</span>
                </div>
                <div className="pt-2 border-t border-[var(--line)] flex justify-between text-[var(--foreground)] font-bold">
                  <span>Audit Trail Export:</span>
                  <span className="text-brand">PDF / CSV with diff hashes</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--line)]">
              <span className="text-xs text-[var(--text-dim)]">
                Dollar figures stay completely hidden until a Workspace Admin securely configures internal blended rates.
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* AI Tool ROI & Delivery Forecast */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Modern Tooling</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            AI Tool Tracking & Delivery Forecasting
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Detect real AI assistance from Git trailers, evaluate Copilot and Cursor seat ROI, and project sprint deadlines with transparent statistical velocity.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
          {/* AI Contribution */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7">
            <div className="flex items-center gap-2 text-purple-400 mb-3">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">AI Contribution Tracker</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">Real AI Disclosure, Not Behavior Guessing</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              We look for explicit git commit metadata trailers (&lsquo;Co-Authored-By: GitHub Copilot&rsquo;, &lsquo;Generated with Cursor&rsquo;) instead of opaque behavioral profiling.
            </p>

            <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--background)]/80 p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Self-Disclosed AI Commits:</span>
                <span className="text-purple-300 font-bold">34.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Verified Test Ratio on AI PRs:</span>
                <span className="text-brand font-bold">89.4% (+4.2% vs avg)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">AI Tool Seats Monitored:</span>
                <span className="text-[var(--foreground)] font-bold">Copilot, Cursor, Claude Code</span>
              </div>
            </div>
          </div>

          {/* Delivery Forecast */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7">
            <div className="flex items-center gap-2 text-brand mb-3">
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Statistical Projection</span>
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)]">Confidence-Weighted Delivery Forecast</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              A transparent statistical trendline extrapolating sprint completion from confidence-weighted velocity. No opaque black-box machine learning promises.
            </p>

            <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--background)]/80 p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Sprint Posture:</span>
                <span className="text-emerald-400 font-bold">On Track (92% probability)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Projected Completion:</span>
                <span className="text-brand font-bold">Thursday 4:15 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Capacity Accuracy:</span>
                <span className="text-[var(--foreground)] font-bold">88.5% planned vs unplanned</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Feature Grid */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Full Feature Lineup</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Everything in Team Intelligence
          </h2>
        </Reveal>

        <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">DORA Metrics Panel</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Deployment frequency, lead time for changes, change failure rate, and restore time benchmarked against your history.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <Gauge className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Git Efficiency Metrics</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              PR size, cycle time broken into 4 stages, merge frequency, review depth, rework rate, and refactor rate.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Coins className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Investment Profile</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Commit volume classified into New Value, Feature Enhancements, Dev Experience, and KTLO without manual surveys.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Compass className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Delivery Risk & Capacity Accuracy</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Active sprint postures (On Track, Scope Creep, Overcommitted) with planning accuracy percentages.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Layers className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Team & Service Segmentation</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Scope DORA or efficiency metrics by named Teams (GitHub groups) or named Services (multi-repo clusters).
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
              <Milestone className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Team Goals (OKR Cascade)</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Set targets on real metrics with automated progress tracking and proactive alerts when a goal is at risk.
            </p>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Common Questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            About Team Intelligence
          </h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "How is Team Intelligence enabled in our workspace?",
                answer:
                  "Team Intelligence sits behind a per-workspace feature flag. By default it is off until a Workspace Admin enables it in Settings. This ensures your organization rolls out engineering metrics intentionally with full team alignment.",
              },
              {
                question: "Do you require Jira or Linear integration for DORA metrics?",
                answer:
                  "No. VeriSprint calculates standard DORA deployment frequency and change failure rates directly from GitHub release tags, pull request merges, and deployment webhooks. Issue tracker integrations enhance investment classification but are not required for DORA.",
              },
              {
                question: "Can we export R&D Capitalization reports for auditors?",
                answer:
                  "Yes. All Cost Capitalization reports can be exported as timestamped PDFs or CSVs with full commit hashes and file references, complying with GAAP ASC 350-40 documentation requirements.",
              },
              {
                question: "Are individual engineers stack-ranked against each other?",
                answer:
                  "Never. VeriSprint does not provide developer stack-ranking boards. Metrics are aggregated at the Team, Service, and Repository levels to empower continuous improvement rather than individual competition.",
              },
            ]}
          />
        </Reveal>
      </Section>

      <PlatformPagination currentSlug="team-intelligence" />

      {/* CTA */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
            See Your Team&apos;s DORA Metrics Today
          </h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">
            Connect your repository and get automated benchmarks in under 3 minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-lg px-8 py-2">
                Start Free with GitHub
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
