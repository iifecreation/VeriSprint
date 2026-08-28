import { Section, Card, SecondaryButton, FAQSection, TrustBadgeRow } from "@/components/ui";
import { INSTALL_URL } from "@/lib/config";
import Link from "next/link";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { MagicCard } from "@/components/magicui/magic-card";
import { Marquee } from "@/components/magicui/marquee";
import { Reveal, RevealGroup, RevealItem, FadeInOnLoad } from "@/components/Reveal";
import { HeroParallax } from "@/components/HeroParallax";
import { ConstellationHero } from "@/components/ConstellationHero";
import { IntegrationBeams } from "@/components/IntegrationBeams";
import { cardAccent } from "@/lib/palette";
import {
  ShieldCheck,
  MessagesSquare,
  TrendingUp,
  Sparkles,
  Rocket,
  Radar,
  Check,
  Minus,
  Landmark,
  ClipboardCheck,
  Building2,
  UserCog,
  Code2,
  GraduationCap,
  GitBranch,
  MessageCircle,
  Ticket,
  Siren,
  Database,
  FileCheck2,
  HelpCircle,
  ScrollText,
  ShieldAlert,
} from "lucide-react";

// Real, existing integrations — generic lucide icons, not brand logos (same
// discipline as IntegrationBeams), so this never implies an official
// partnership. Framed as "works with," not a fake customer-logo strip.
const INTEGRATIONS = [
  { icon: GitBranch, label: "GitHub" },
  { icon: MessageCircle, label: "Slack" },
  { icon: Ticket, label: "Jira / Linear" },
  { icon: Siren, label: "PagerDuty" },
  { icon: Database, label: "Datadog" },
  { icon: FileCheck2, label: "Stripe" },
];

// The real problem, framed honestly — not a fabricated pain-point survey,
// just the three places "trust me, it's basically done" actually breaks
// down, each mapped to the VeriSprint feature that closes it.
const PROBLEMS = [
  {
    icon: HelpCircle,
    title: "Status is self-reported",
    body: "A standup update or a \"Done\" ticket is a claim, not a fact — and by the time it's wrong, it's expensive to find out.",
  },
  {
    icon: ScrollText,
    title: "Scores are a black box",
    body: "Most engineering-analytics tools show you a number with no way to check it. If you can't see the evidence, you're back to trusting a claim.",
  },
  {
    icon: ShieldAlert,
    title: "Audits start from zero",
    body: "Cost capitalization, investor updates, client billing — every one of them means someone manually reconstructing what actually happened, again.",
  },
];

const PILLARS = [
  { icon: ShieldCheck, title: "Evidence-first judgment", body: "Every score is traceable to cited evidence (tests, call graph, TODOs, acceptance-criteria match) — inspectable, not a black box. Click a score, see exactly why." },
  { icon: Code2, title: "Developer-first framing", body: "Saves developers time first, with auto-drafted standups and onboarding docs. Verification for PMs is a byproduct of a tool developers actually want to use, not a surveillance layer imposed on them." },
  { icon: Rocket, title: "Outward-facing, not just internal", body: "The same engine faces clients (agency proof-of-work portal), investors (update generator), and new hires (onboarding docs) — audiences the engineering-intelligence category never touches." },
  { icon: Sparkles, title: "Narrow, fast, self-serve", body: "No sales call, no multi-week rollout, no dedicated implementation team. Connect a repo and see your first Evidence Ledger the same day." },
];

const PERSONAS = [
  { icon: Landmark, role: "Founders & Execs", need: "Know if progress is real before the next investor update, without pulling an engineer off real work to translate it for you.", feature: "Investor Update Generator" },
  { icon: ClipboardCheck, role: "Product Managers", need: "Verify standup claims without learning to read a diff yourself — the evidence is already summarized in plain English.", feature: "Claimed vs Shipped & Risk Radar" },
  { icon: Building2, role: "Agency Owners", need: "Prove billed hours match real delivered work, with a link a client can check any time — no codebase access required.", feature: "Client Proof-of-Work Portal" },
  { icon: UserCog, role: "Engineering Managers", need: "Spot stuck work and team health signals before they become a missed deadline, not after.", feature: "Blocker Nudge Bot & DORA Panel" },
  { icon: Code2, role: "Developers", need: "Stop re-explaining work in every standup; get credit for real progress automatically, and see the exact same evidence a PM sees about you.", feature: "Auto-Drafted Standups" },
  { icon: GraduationCap, role: "New Hires", need: "Understand an unfamiliar codebase fast, from docs generated off what actually changed recently and why.", feature: "Onboarding Doc Generator" },
];

const STEPS = [
  {
    title: "Connect a repo",
    body: "Install the read-only GitHub App — Contents, Metadata, and Pull Requests only. VeriSprint can never push code, merge a PR, or touch a repo setting.",
    metric: "Read-only",
    metricLabel: "GitHub App scopes",
  },
  {
    title: "Every commit becomes evidence",
    body: "Each diff is checked for tests added, TODOs, dead code, and call-graph context — logged as a structured, inspectable Evidence Item, not a one-line summary.",
    metric: "Cited",
    metricLabel: "Every judgment, traceable",
  },
  {
    title: "A real Confidence Score",
    body: "Tickets get a 0–100 score computed from their own Evidence Ledger, with the plain-English rationale always visible next to the number — never a bare score with no explanation.",
    metric: "0–100",
    metricLabel: "Per-ticket, with rationale",
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Confidence Score",
    body: "A transparent 0–100 score per ticket, computed from that ticket's own Evidence Ledger — with the evidence always one click away, never a black-box number.",
    mock: { label: "ENG-409", value: "78 / 100", note: "tests added, 1 branch uncovered" },
  },
  {
    icon: Radar,
    title: "Claimed vs. Shipped",
    body: "Flags mismatches as questions, never accusations — 'ENG-123 is marked Done — I don't see tests added yet, did those land under a different commit?'",
    mock: { label: "ENG-123", value: "Flagged", note: "tests missing — different commit?" },
  },
  {
    icon: MessagesSquare,
    title: "AI Repo Chat",
    body: "Ask your codebase a plain question — 'did we ship the checkout redesign this week?' — and get an answer grounded in real commits, with citations back to the exact diffs.",
    mock: { label: "Query", value: "6 commits", note: "PR #412 merged Thu · 2 citations" },
  },
  {
    icon: TrendingUp,
    title: "Confidence-Weighted Burndown",
    body: "A sprint burndown built from real Confidence Score history instead of self-reported percentages — a materially more honest read on whether a sprint is actually on track.",
    mock: { label: "Sprint 12", value: "68% complete", note: "confidence-weighted, not self-reported" },
  },
];

// The full parity matrix — every row here maps to a real, working feature
// (backend route + frontend page), not an aspirational roadmap item. See
// /features for the same list organized by product instead of by competitor.
const COMPARISON_MATRIX = [
  // VeriSprint-only — the verification layer none of the five touch.
  { feature: "Evidence-first verification (Commit ↔ Ticket)", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "AI Repo Chat", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Client Proof-of-Work Portal", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Investor Update Generator", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Onboarding Doc Generator", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Multi-Repo / Monorepo Intelligence", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Ticket Drift & Orphan Commit Detectors", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  // Competitor-parity — matched, not just referenced.
  { feature: "Investment Allocation", vs: true, jelly: true, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Cost Capitalization Report", vs: true, jelly: true, linear: false, gitclear: false, swarmia: false, allstacks: true },
  { feature: "SSO (OIDC) + SCIM Provisioning", vs: true, jelly: true, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "DORA Metrics Panel", vs: true, jelly: false, linear: true, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Team Goals & Targets", vs: true, jelly: false, linear: true, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Blocker Nudge Bot", vs: true, jelly: false, linear: true, gitclear: false, swarmia: false, allstacks: false },
  { feature: "PR AutoRoute (reviewer assignment)", vs: true, jelly: false, linear: true, gitclear: false, swarmia: false, allstacks: false },
  { feature: "AI Contribution Tracker", vs: true, jelly: false, linear: true, gitclear: true, swarmia: true, allstacks: false },
  { feature: "Code Health Signals", vs: true, jelly: false, linear: false, gitclear: true, swarmia: false, allstacks: false },
  { feature: "Visual Changelog", vs: true, jelly: false, linear: false, gitclear: true, swarmia: false, allstacks: false },
  { feature: "Private / On-Prem LLM Option", vs: true, jelly: false, linear: false, gitclear: true, swarmia: false, allstacks: false },
  { feature: "Pulse Surveys", vs: true, jelly: false, linear: false, gitclear: false, swarmia: true, allstacks: false },
  { feature: "Working Agreements", vs: true, jelly: false, linear: false, gitclear: false, swarmia: true, allstacks: false },
  { feature: "Delivery Forecast", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: true },
  { feature: "Risk Radar", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: true },
  { feature: "Value Stream View", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: true },
  { feature: "Open Integration Framework", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: true },
  { feature: "MCP Server (query your evidence from Claude/Cursor)", vs: true, jelly: true, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "AI Tool Cost Tracking", vs: true, jelly: true, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Report Builder (pick-your-sections reports)", vs: true, jelly: true, linear: false, gitclear: false, swarmia: false, allstacks: false },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section — innerClassName replaces Section's default py-20/28
          with exact, intentional spacing instead of stacking on top of it
          (that stacking, plus the old min-h-85vh + justify-center combo,
          was the source of the large dead gap above the headline). */}
      <Section
        variant="default"
        className="border-b border-[var(--line)] relative overflow-hidden"
        innerClassName="pt-14 pb-20 sm:pt-20 sm:pb-24"
        background={
          <>
            <ConstellationHero />
            <DotPattern className="opacity-40" />
          </>
        }
      >
        <div className="mx-auto max-w-4xl text-center relative z-20">
          <FadeInOnLoad delay={0.08}>
            <h1 className="text-5xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-7xl !leading-tight">
              What your team actually shipped —<br />
              <span className="text-brand">and proof it happened.</span>
            </h1>
          </FadeInOnLoad>
          <FadeInOnLoad delay={0.16}>
            <p className="mx-auto mt-8 max-w-2xl text-xl text-[var(--text-muted)] leading-relaxed">
              VeriSprint reads every commit and pull request in depth and turns raw code activity into a verified,
              plain-language account of what was really built — reconciled against what was claimed in standups,
              tickets, and status updates.
            </p>
          </FadeInOnLoad>
          <FadeInOnLoad delay={0.24}>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row relative z-20">
              <Link href={INSTALL_URL} className="w-full sm:w-auto">
                <ShimmerButton background="linear-gradient(135deg, #74c9d3, #2f7d86)" className="w-full text-lg text-[#04201f] font-semibold shadow-[0_0_50px_rgba(79,184,196,0.3)]">
                  Connect a repo, free <span className="ml-2">→</span>
                </ShimmerButton>
              </Link>
              <SecondaryButton href="/how-it-works" className="w-full sm:w-auto text-lg px-10 py-4">See how it works</SecondaryButton>
            </div>
            <p className="mt-6 text-sm text-[var(--text-dim)]">No credit card. No sales call. First Evidence Ledger the same day you connect.</p>
          </FadeInOnLoad>
        </div>

        {/* Terminal/IDE Mock UI Dashboard */}
        <HeroParallax className="mx-auto mt-20 max-w-5xl relative z-10">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_0_50px_rgba(79,184,196,0.3)] overflow-hidden flex flex-col font-mono">
            {/* Terminal header */}
            <div className="bg-[var(--background)] border-b border-[var(--line)] px-4 py-2 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-900"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-900"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80 border border-green-900"></div>
              </div>
              <div className="text-xs text-[var(--text-dim)] flex-1 text-center mr-8">verisprint-engine ~ /core</div>
            </div>
            <div className="flex flex-col md:flex-row min-h-[350px] bg-[var(--surface)]">
              {/* Sidebar File Tree */}
              <div className="w-64 bg-[var(--background)]/50 border-r border-[var(--line)] p-4 hidden md:block text-xs text-[var(--text-muted)]">
                <div className="uppercase tracking-wider text-[var(--text-dim)] mb-4 font-semibold">Explorer</div>
                <div className="space-y-2">
                  <div className="text-[var(--foreground)] flex items-center gap-2"><span>📂</span> src</div>
                  <div className="pl-5 border-l border-[var(--line)] space-y-2 mt-2 ml-2">
                    <div className="text-[var(--accent-neon)] flex items-center gap-2"><span>📄</span> api_handler.go</div>
                    <div className="flex items-center gap-2"><span>📄</span> models.rs</div>
                    <div className="flex items-center gap-2"><span>📄</span> auth_test.go</div>
                  </div>
                </div>
              </div>
              {/* Main Log area */}
              <div className="flex-1 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--line)]">
                  <div className="text-sm text-[var(--text-muted)]">Evaluating PR <span className="text-[var(--foreground)]">#1042</span></div>
                  <div className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded uppercase tracking-wider">Confidence: 98%</div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="text-sm text-[var(--text-dim)]">
                    <span className="text-[var(--accent-neon)]">info</span>  [analyzer] Extracted 4 evidence items from commit <span className="text-[var(--text-muted)]">c3f9a1b</span>
                  </div>
                  <div className="text-sm text-[var(--text-dim)]">
                    <span className="text-[var(--accent-neon)]">info</span>  [analyzer] Verified test coverage for <span className="text-[var(--text-muted)]">api_handler.go</span>
                  </div>
                  <div className="p-4 bg-[var(--background)] border border-[var(--line)] rounded text-xs text-[var(--text-muted)] mt-4 leading-relaxed">
                    {`{\n  "status": "verified",\n  "confidence_score": 98,\n  "linked_ticket": "ENG-409",\n  "evidence": ["added_tests", "resolved_todos"]\n}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </HeroParallax>
      </Section>

      {/* Works-with marquee — real, existing integrations, generic icons
          rather than fetched brand logos (same discipline as
          IntegrationBeams) so this never implies an official partnership. */}
      <Section variant="default" className="border-b border-[var(--line)] bg-[var(--background)] py-10">
        <Reveal>
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">Works with the tools you already use</p>
          <Marquee durationSeconds={26}>
            {INTEGRATIONS.map((item) => (
              <span key={item.label} className="flex shrink-0 items-center gap-2.5 text-[var(--text-muted)]">
                <item.icon className="h-5 w-5 text-[var(--accent-neon)]" strokeWidth={1.75} />
                <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>
              </span>
            ))}
          </Marquee>
        </Reveal>
      </Section>

      {/* Problem framing — the three real places "trust me, it's basically
          done" breaks down, each mapped to a real feature that closes it. */}
      <Section variant="default" className="border-b border-[var(--line)] bg-[var(--surface)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Where "basically done" breaks down</p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Every status update is a claim. <span className="text-brand">Someone still has to check it.</span>
          </h2>
        </Reveal>
        <RevealGroup className="grid gap-6 md:grid-cols-3 mx-auto max-w-6xl">
          {PROBLEMS.map((p, i) => {
            const accent = cardAccent(i);
            return (
              <RevealItem key={p.title}>
                <Card className="h-full bg-[var(--background)] border-[var(--line)]">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}>
                    <p.icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{p.title}</h3>
                  <p className="text-[var(--text-muted)] leading-relaxed">{p.body}</p>
                </Card>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </Section>

      {/* Integration flow — a real Animated Beam diagram, not decoration:
          this is the actual shape of where analysis results go once a
          commit lands. */}
      <Section variant="default" className="border-b border-[var(--line)] bg-[var(--background)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">One connection, everywhere it needs to go</p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">From your repo to your whole team&apos;s tools.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <IntegrationBeams />
        </Reveal>
      </Section>

      {/* Bento Grid / Stats Section */}
      <Section variant="default" className="pt-32">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">From a git push to a verified score</p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Three steps. <span className="text-brand">Nothing self-reported.</span>
          </h2>
        </Reveal>

        <RevealGroup className="grid gap-6 md:grid-cols-3 mx-auto max-w-6xl">
          {STEPS.map((step, i) => (
            <RevealItem key={step.title}>
              <Card className={i === 0 ? "bg-[var(--background)] md:row-span-2 flex h-full flex-col justify-between border-[var(--line)]" : "h-full bg-[var(--surface)] border-[var(--line)]"}>
                <div>
                  <h3 className="text-4xl font-bold mb-2 text-[var(--foreground)]">{step.metric}</h3>
                  <p className="text-xs font-bold uppercase tracking-wider font-monor text-brand mb-10">{step.metricLabel}</p>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-[var(--foreground)]">{step.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{step.body}</p>
                </div>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Features Section */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Core Features</p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">Where human insight meets intelligent technology</h2>
        </Reveal>

        <RevealGroup className="grid gap-8 md:grid-cols-2 mx-auto max-w-6xl">
          {FEATURES.map((f, i) => {
            const accent = cardAccent(i);
            return (
              <RevealItem key={f.title}>
                <MagicCard className="p-0 flex h-full flex-col bg-[var(--background)] border-none shadow-sm">
                  <div className="p-8 pb-0">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}>
                      <f.icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--foreground)] mb-3">{f.title}</h3>
                    <p className="text-[var(--text-muted)] leading-relaxed">{f.body}</p>
                  </div>
                  <div className="mt-8 flex-1 p-6 relative overflow-hidden flex items-end justify-center min-h-[220px]">
                    <div className="w-[110%] bg-[var(--surface)] rounded-t-2xl shadow-xl border border-[var(--line)] relative translate-y-4 p-6 grid gap-3 font-mono text-xs transition-transform hover:-translate-y-2 z-20">
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-dim)] uppercase tracking-wider">{f.mock.label}</span>
                        <span className={`rounded-full ${accent.bg} px-2 py-0.5 font-bold ${accent.text}`}>{f.mock.value}</span>
                      </div>
                      <div className="flex items-start gap-2 text-[var(--text-muted)]">
                        <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accent.text}`} />
                        <span>{f.mock.note}</span>
                      </div>
                    </div>
                  </div>
                </MagicCard>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </Section>

      {/* Differentiation Pillars */}
      <Section variant="default" className="pt-32 bg-[var(--background)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Why VeriSprint?</p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Unlike legacy engineering intelligence tools, we verify the <span className="text-brand">truth</span>.
          </h2>
          <p className="mt-6 text-lg text-[var(--text-muted)] leading-relaxed">
            Legacy tools aggregate Git metrics into executive dashboards to track velocity. We actually read the diffs to tell you if the feature is functionally finished.
          </p>
        </Reveal>

        <RevealGroup className="grid gap-6 md:grid-cols-2 mx-auto max-w-5xl">
          {PILLARS.map((pillar, i) => {
            const accent = cardAccent(i + 2);
            return (
              <RevealItem key={pillar.title}>
                <MagicCard className="flex h-full flex-col border-[var(--line)]">
                  <div className="flex h-full flex-col">
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
                      <pillar.icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <h4 className="text-xl font-bold text-[var(--foreground)] mb-2">{pillar.title}</h4>
                    <p className="text-[var(--text-muted)] leading-relaxed flex-1">{pillar.body}</p>
                  </div>
                </MagicCard>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </Section>

      {/* Comparison Matrix Section */}
      <Section variant="default" className="py-24 border-b border-[var(--line)] relative overflow-hidden bg-[var(--surface)]">
        <Reveal className="mx-auto max-w-4xl text-center mb-16 relative z-10">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Feature Parity</p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">Everything you need, <br /> none of the fragmentation.</h2>
          <p className="mt-6 text-lg text-[var(--text-muted)] leading-relaxed max-w-2xl mx-auto">
            Every headline capability across Jellyfish, LinearB, GitClear, Swarmia, and Allstacks has a real, working
            home here — not a roadmap promise. Every row below is a live feature with its own page in the product,
            detailed on <a href="/features" className="text-brand underline">Features</a>.
          </p>
        </Reveal>

        <Reveal className="mx-auto max-w-6xl overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse border border-[var(--line)] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(79,184,196,0.1)]">
            <thead>
              <tr className="bg-[var(--background)] border-b border-[var(--line)]">
                <th className="py-4 px-6 font-mono text-sm text-[var(--text-muted)] w-1/3">Feature</th>
                <th className="py-4 px-6 font-mono text-sm text-[var(--accent-neon)] border-x border-[var(--accent-neon)]/30 bg-[var(--accent-neon)]/5 text-center">VeriSprint</th>
                <th className="py-4 px-4 font-mono text-xs text-[var(--text-dim)] text-center">Jellyfish</th>
                <th className="py-4 px-4 font-mono text-xs text-[var(--text-dim)] text-center">LinearB</th>
                <th className="py-4 px-4 font-mono text-xs text-[var(--text-dim)] text-center">GitClear</th>
                <th className="py-4 px-4 font-mono text-xs text-[var(--text-dim)] text-center">Swarmia</th>
                <th className="py-4 px-4 font-mono text-xs text-[var(--text-dim)] text-center">Allstacks</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--surface)] divide-y divide-[var(--line)]">
              {COMPARISON_MATRIX.map((row, i) => (
                <tr key={i} className="hover:bg-[var(--background)] transition-colors">
                  <td className="py-4 px-6 text-sm text-[var(--text-muted)]">{row.feature}</td>
                  <td className="py-4 px-6 text-center border-x border-[var(--accent-neon)]/30 bg-[var(--accent-neon)]/5 text-[var(--foreground)]">
                    {row.vs ? <Check className="mx-auto h-4 w-4 text-brand" /> : <Minus className="mx-auto h-4 w-4 text-[var(--text-dim)]" />}
                  </td>
                  <td className="py-4 px-4 text-center text-[var(--text-dim)]">{row.jelly ? <Check className="mx-auto h-4 w-4" /> : <Minus className="mx-auto h-4 w-4" />}</td>
                  <td className="py-4 px-4 text-center text-[var(--text-dim)]">{row.linear ? <Check className="mx-auto h-4 w-4" /> : <Minus className="mx-auto h-4 w-4" />}</td>
                  <td className="py-4 px-4 text-center text-[var(--text-dim)]">{row.gitclear ? <Check className="mx-auto h-4 w-4" /> : <Minus className="mx-auto h-4 w-4" />}</td>
                  <td className="py-4 px-4 text-center text-[var(--text-dim)]">{row.swarmia ? <Check className="mx-auto h-4 w-4" /> : <Minus className="mx-auto h-4 w-4" />}</td>
                  <td className="py-4 px-4 text-center text-[var(--text-dim)]">{row.allstacks ? <Check className="mx-auto h-4 w-4" /> : <Minus className="mx-auto h-4 w-4" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      {/* Personas Section */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">Built for your role</h2>
          <p className="mt-4 text-lg text-[var(--text-muted)]">Verification that serves the whole team, not just the VP of Engineering.</p>
        </Reveal>
        <RevealGroup className="grid gap-6 md:grid-cols-3 lg:grid-cols-6 mx-auto max-w-7xl">
          {PERSONAS.map((p, i) => {
            const accent = cardAccent(i);
            return (
              <RevealItem key={p.role}>
                <Card className={`shadow-sm border-t-4 bg-[var(--surface)] flex h-full flex-col ${accent.border}`}>
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
                    <p.icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-2">{p.role}</h3>
                  <p className="text-xs text-[var(--text-muted)] mb-6 flex-1 leading-relaxed">{p.need}</p>
                  <div className="pt-3 border-t border-[var(--line)] mt-auto">
                    <p className="text-[10px] font-semibold text-[var(--text-dim)] uppercase mb-1">Key Feature</p>
                    <p className={`text-xs font-bold ${accent.text}`}>{p.feature}</p>
                  </div>
                </Card>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </Section>

      {/* Why evidence, not testimonials — deliberately not a fake social-proof
          section: we're early (see /about), and a product built on "trust
          the evidence, not the claim" shouldn't ask you to trust an
          unverifiable quote instead. */}
      <Section variant="default" className="bg-[var(--background)] border-y border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Why no testimonials here</p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            We ask you to trust the evidence, <br className="hidden sm:block" /> not our word.
          </h2>
          <p className="mt-6 text-lg text-[var(--text-muted)] leading-relaxed">
            VeriSprint is early — a small, independent project, not an established company with a customer roster to
            quote. A product built around &ldquo;verify, don&apos;t just believe the claim&rdquo; would be
            undermining its own point by asking you to take an unverifiable testimonial on faith instead. So instead
            of a wall of quotes, here&apos;s what we&apos;d rather you check yourself:
          </p>
        </Reveal>
        <Reveal delay={0.15} className="mx-auto mt-12 max-w-4xl">
          <TrustBadgeRow
            items={[
              "Read-only GitHub scopes — verify in the App's own permission screen",
              "Every score links back to its evidence — verify in your own dashboard",
              "Free tier, no time limit, no card required — verify in 5 minutes",
            ]}
          />
        </Reveal>
      </Section>

      {/* FAQ */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Questions</p>
          <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">Before you connect a repo</h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Can VeriSprint push code, merge PRs, or change repo settings?",
                answer: "No. The GitHub App only ever requests Contents (read), Metadata (read), and Pull Requests (read). There is no write scope to request in the first place — see the Security page for the full breakdown.",
              },
              {
                question: "Will this feel like surveillance to my developers?",
                answer: "It's built specifically to avoid that: every developer sees the exact same Evidence Ledger and dashboard that gets shown about their own work — two-way transparency by default, not a manager-only view. Mismatches are always phrased as questions, never accusations.",
              },
              {
                question: "Does VeriSprint train an AI model on our code?",
                answer: "No. Diffs are sent to the configured LLM provider (Claude API by default) for that one analysis call and are not used to train any model. If your policy doesn't allow sending code to a third-party API at all, point VeriSprint at a self-hosted, OpenAI-compatible model instead — see Security.",
              },
              {
                question: "What happens on the Free tier?",
                answer: "One connected repo, the full Evidence Ledger and Confidence Score pipeline, claimed-vs-shipped reconciliation, auto-drafted standups, and the Client Proof-of-Work Portal — no time limit, no credit card. See Pricing for what each paid tier adds.",
              },
              {
                question: "How is this different from Jellyfish, LinearB, GitClear, Swarmia, or Allstacks?",
                answer: "Those tools aggregate Git metrics into dashboards that track activity and velocity. VeriSprint actually reads the diff and reasons about whether the work is functionally complete — then reconciles that against what was claimed in a ticket or standup. See the Features page for a full side-by-side.",
              },
            ]}
          />
        </Reveal>
      </Section>

      {/* Bottom CTA */}
      <Section variant="default" className="py-32 bg-[var(--surface)]">
        <Reveal className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold text-[var(--foreground)] sm:text-6xl mb-8 leading-tight">We combine human insight <br /> with artificial intelligence</h2>
          <p className="text-xl text-[var(--text-muted)] mb-12 max-w-2xl mx-auto leading-relaxed">
            Ready to see what your team actually shipped? Start your free trial today and say goodbye to status update theater.
          </p>
          <Link href={INSTALL_URL} className="inline-block">
            <ShimmerButton background="linear-gradient(135deg, #74c9d3, #2f7d86)" className="text-lg px-10 py-3.5 text-[#04201f] font-semibold">Start for free</ShimmerButton>
          </Link>
        </Reveal>
      </Section>
    </>
  );
}
