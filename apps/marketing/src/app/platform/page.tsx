import type { Metadata } from "next";
import Link from "next/link";
import { Section, PageHeader, FAQSection, PrimaryButton, SecondaryButton } from "@/components/ui";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { HeroBackground } from "@/components/HeroBackground";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { PlatformSubNav } from "@/components/PlatformNav";
import { INSTALL_URL } from "@/lib/config";
import { PRODUCTS } from "@/lib/products";
import { cardAccent } from "@/lib/palette";
import {
  ShieldCheck,
  BarChart3,
  Radar,
  MessagesSquare,
  HeartHandshake,
  KeyRound,
  ArrowRight,
  GitBranch,
  CheckCircle2,
  Cpu,
  Layers,
  Database,
  Terminal,
  Activity,
  Zap,
  Lock,
  Workflow,
  Sparkles,
  GitPullRequest,
  Check,
  X,
  Minus,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Platform Overview — VeriSprint Engineering Verification",
  description:
    "Explore the VeriSprint platform: one unified evidence pipeline powering six dedicated products — Verification Engine, Team Intelligence, Risk & Automation, Reporting, Team Health, and Enterprise.",
};

const ARCHITECTURE_STEPS = [
  {
    step: "01",
    name: "Source Ingestion",
    icon: GitBranch,
    tag: "Read-Only Scopes",
    desc: "Ingests commit diffs, pull request threads, and Jira/Linear ticket transitions via webhooks within milliseconds of push.",
    metrics: "< 450ms webhook response",
  },
  {
    step: "02",
    name: "AST & Semantic Analysis",
    icon: Cpu,
    tag: "Zero Model Training",
    desc: "Parses abstract syntax trees to detect tests added or deleted, call-graph integration, dead code, open TODOs, and AI authorship trailers.",
    metrics: "12 languages supported",
  },
  {
    step: "03",
    name: "The Evidence Ledger",
    icon: Database,
    tag: "Immutable Records",
    desc: "Every finding is logged as an immutable Evidence Item tied to a file, line range, and ticket key. Every score is mathematically auditable.",
    metrics: "100% cited rationale",
  },
  {
    step: "04",
    name: "6-Pillar Distribution",
    icon: Layers,
    tag: "Unified Dispatch",
    desc: "The single ledger fans out into DORA metrics, standup drafts, risk alarms, pulse correlations, R&D tax reports, and live AI Repo Chat.",
    metrics: "Zero duplicate pipelines",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Data Source Grounding",
    verisprint: "Real git commits & AST diffs",
    legacyAnalytics: "Ticket timestamps & self-reports",
    swarmia: "PR review timestamps only",
    jira: "Manual drag-and-drop status",
  },
  {
    feature: "Confidence Scoring",
    verisprint: "0–100 with inspectable math & citations",
    legacyAnalytics: "Black-box proprietary metric",
    swarmia: "None (heuristic alerts only)",
    jira: "None (binary To Do / Done)",
  },
  {
    feature: "Reconciliation Framing",
    verisprint: "Two-way constructive questions in standup",
    legacyAnalytics: "Manager-only surveillance dashboards",
    swarmia: "Slack alerts to individual reviewer",
    jira: "Manual audit in sprint retrospective",
  },
  {
    feature: "AI Contribution Tracking",
    verisprint: "Real Co-Authored trailers & spend ROI",
    legacyAnalytics: "Behavioral guessing or vendor survey",
    swarmia: "Not supported",
    jira: "Not supported",
  },
  {
    feature: "External Client & Tax Portals",
    verisprint: "Tokenized proof-of-work & ASC 350-40 reports",
    legacyAnalytics: "Internal exports only",
    swarmia: "Not supported",
    jira: "Manual CSV export & pivot tables",
  },
  {
    feature: "Private / On-Prem LLM Option",
    verisprint: "vLLM / Ollama VPC gateway support",
    legacyAnalytics: "Third-party cloud only",
    swarmia: "Not supported",
    jira: "Atlassian Intelligence Cloud only",
  },
];

export default function PlatformOverviewPage() {
  return (
    <>
      <PlatformSubNav />

      {/* Hero Section */}
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
            The VeriSprint Architecture
          </p>
          <PageHeader
            title="One Evidence Engine. Six Transformative Products."
            subtitle="VeriSprint replaces disconnected metrics dashboards, noisy Slack bots, and manual sprint spreadsheets with a single evidence pipeline grounded in real commits."
          />

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-base px-8 py-3">
                Connect a GitHub Repo
              </ShimmerButton>
            </Link>
            <SecondaryButton href="#pillars">Explore the 6 Pillars ↓</SecondaryButton>
          </div>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-2xl font-bold text-[var(--foreground)] font-mono">100%</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">Traceable to real diffs</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-2xl font-bold text-brand font-mono">0 Bytes</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">Used to train AI models</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-2xl font-bold text-[var(--foreground)] font-mono">&lt; 450ms</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">Webhook processing SLA</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-2xl font-bold text-brand font-mono">1 Pipeline</p>
              <p className="text-xs text-[var(--text-dim)] mt-1">Zero duplicate data silos</p>
            </div>
          </div>
        </div>
      </Section>

      {/* The Single Engine Architecture */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Core Engineering</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            How Raw Commits Become Truth
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Every other tool in the engineering management space relies on self-reported statuses, Jira estimate fields, or isolated PR duration clocks. VeriSprint inspects the real code diff.
          </p>
        </Reveal>

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-4 relative">
            {ARCHITECTURE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.step} delay={0.08 * i}>
                  <div className="relative h-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm hover:border-brand/40 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono text-2xl font-black text-brand/40">{step.step}</span>
                        <span className="rounded-full bg-[var(--line)]/50 px-2.5 py-0.5 text-[10px] font-mono text-[var(--text-dim)]">
                          {step.tag}
                        </span>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-4">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-bold text-[var(--foreground)]">{step.name}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{step.desc}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-[var(--line)]/60">
                      <span className="text-[11px] font-mono text-brand font-semibold">{step.metrics}</span>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Section>

      {/* The 6 Pillars */}
      <Section variant="default" id="pillars" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Six Specialized Products</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Explore Every Product Area
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Each product solves a specific buyer and team problem, powered by the exact same underlying Evidence Ledger.
          </p>
        </Reveal>

        <div className="mx-auto max-w-6xl">
          <RevealGroup className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((prod, idx) => {
              const accent = cardAccent(idx);
              const icons = [ShieldCheck, BarChart3, Radar, MessagesSquare, HeartHandshake, KeyRound];
              const Icon = icons[idx] ?? ShieldCheck;

              return (
                <RevealItem key={prod.slug}>
                  <div className="group flex h-full flex-col justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7 shadow-sm hover:border-brand/50 hover:shadow-lg transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}>
                          <Icon className="h-6 w-6" strokeWidth={2} />
                        </div>
                        <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">
                          {prod.eyebrow}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-[var(--foreground)] group-hover:text-brand transition-colors">
                        {prod.name}
                      </h3>
                      <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
                        {prod.pitch}
                      </p>

                      <div className="mt-6 rounded-xl border border-[var(--line)]/60 bg-[var(--background)]/60 p-4">
                        <span className="block text-2xl font-bold font-mono text-[var(--foreground)]">{prod.stat.value}</span>
                        <span className="block text-xs text-[var(--text-dim)] mt-0.5">{prod.stat.label}</span>
                      </div>

                      <div className="mt-5 space-y-2">
                        {prod.features.slice(0, 3).map((f) => (
                          <div key={f.title} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-brand shrink-0" />
                            <span className="font-medium text-[var(--foreground)]/90">{f.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 pt-5 border-t border-[var(--line)]">
                      <Link
                        href={`/platform/${prod.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-brand group-hover:translate-x-1 transition-transform"
                      >
                        Deep Dive into {prod.name}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </Section>

      {/* Comparison Matrix */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Architectural Comparison</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Why Unified Evidence Beats Point Solutions
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Most teams stitch together Jellyfish for DORA, Swarmia for Slack nudges, Jira for sprint boards, and manual spreadsheets for R&D tax credits. Here is how VeriSprint compares.
          </p>
        </Reveal>

        <div className="mx-auto max-w-6xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="py-4 px-4 text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Capability</th>
                <th className="py-4 px-4 text-xs font-mono uppercase tracking-wider text-brand font-bold bg-brand/10 rounded-t-lg">
                  VeriSprint
                </th>
                <th className="py-4 px-4 text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Jellyfish / LinearB</th>
                <th className="py-4 px-4 text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Swarmia</th>
                <th className="py-4 px-4 text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Jira / Standups</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] text-sm">
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.feature} className={i % 2 === 0 ? "bg-[var(--surface)]/30" : ""}>
                  <td className="py-4 px-4 font-semibold text-[var(--foreground)]">{row.feature}</td>
                  <td className="py-4 px-4 font-bold text-brand bg-brand/5 border-x border-[var(--line)]/50">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-brand shrink-0" strokeWidth={3} />
                      <span>{row.verisprint}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-[var(--text-muted)]">{row.legacyAnalytics}</td>
                  <td className="py-4 px-4 text-[var(--text-muted)]">{row.swarmia}</td>
                  <td className="py-4 px-4 text-[var(--text-dim)]">{row.jira}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Role-Based Workflows */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Audience Alignment</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Built for Developers First, Valuable for Leadership Always
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Surveillance tools fail because engineers resent them. VeriSprint saves developers time before it reports up.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8">
            <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">For Engineers</span>
            <h3 className="text-xl font-bold text-[var(--foreground)] mt-2">Zero Status Typing, Complete Credit</h3>
            <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <span><strong>Auto-drafted standups:</strong> Yesterday&apos;s commits formatted into Slack updates in one click.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <span><strong>Two-way transparency:</strong> You see the exact same Confidence Score and evidence your manager sees.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <span><strong>Orphan commit credit:</strong> 1-click retroactive links for work that slipped through without a ticket key.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8">
            <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">For Engineering Leadership</span>
            <h3 className="text-xl font-bold text-[var(--foreground)] mt-2">Defensible Forecasting & Board Peace of Mind</h3>
            <ul className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <span><strong>Audit-ready R&D capitalization:</strong> Tax credit categorization directly backed by commit ASTs.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <span><strong>Early risk radar:</strong> Scope creep and drift flagged 10 days before sprint deadline misses.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <span><strong>Investor updates in 1 click:</strong> High-level progress narratives auto-drafted from verified code.</span>
              </li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Common Platform Questions */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Frequently Asked Questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Platform Architecture & Privacy
          </h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Do you ever train AI models on our code or commit history?",
                answer:
                  "Never. We have strict zero-data-retention and zero-training commitments with our LLM inference providers. Furthermore, Enterprise workspaces can route all analysis through private, self-hosted LLM gateways inside their own VPC (such as vLLM or Ollama).",
              },
              {
                question: "What permissions does the VeriSprint GitHub App require?",
                answer:
                  "VeriSprint installs as a read-only GitHub App (Contents: Read-only, Metadata: Read-only, Pull requests: Read-only). If and only if your Workspace Admin explicitly enables PR Workflow Automation, a scoped Pull Requests write permission is requested for auto-labeling and safe documentation reviews.",
              },
              {
                question: "How does VeriSprint avoid weaponizing metrics against engineers?",
                answer:
                  "By enforcing strict two-way transparency: every developer has immediate access to the exact Evidence Ledger, confidence ratings, and standup flags visible to management. Mismatches are phrased as constructive inquiries in private standup digests rather than public blame boards.",
              },
              {
                question: "Can we start with one repo and expand later?",
                answer:
                  "Yes. The Free tier includes the complete Verification Engine and Client Portal for one repository with no time limit. Multi-repo services, team segmentation, and advanced DORA metrics can be toggled on per-workspace whenever your team is ready.",
              },
            ]}
          />
        </Reveal>
      </Section>

      {/* CTA Section */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            See Your Own Commits Verified in 3 Minutes
          </h2>
          <p className="mt-4 text-lg text-[var(--text-muted)]">
            Connect a GitHub repository — no credit card, no sales calls, no complex installation scripts.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-base px-8 py-3">
                Connect GitHub Repo Now
              </ShimmerButton>
            </Link>
            <SecondaryButton href="/pricing">View Pricing & Plans</SecondaryButton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
