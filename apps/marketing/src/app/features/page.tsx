import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section, FAQSection } from "@/components/ui";
import { INSTALL_URL } from "@/lib/config";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { HeroBackground } from "@/components/HeroBackground";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { cardAccent } from "@/lib/palette";
import {
  ShieldCheck,
  Radar,
  History,
  Sparkles,
  Activity,
  Target,
  BarChart3,
  Landmark,
  TrendingUp,
  Waypoints,
  GitPullRequestArrow,
  BellRing,
  RadarIcon,
  MessagesSquare,
  ClipboardList,
  Mail,
  FileClock,
  PieChart,
  FileText,
  ChartNoAxesGantt,
  Link2,
  HeartHandshake,
  ScrollText,
  KeyRound,
  FileCheck2,
  Cable,
  ServerCog,
  Plug,
  Wallet,
  FileSliders,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features — VeriSprint",
  description: "Six product areas, thirty-three features, every one traced back to a real commit — Evidence Ledger, Team Intelligence, Risk & Automation, Reporting, Team Health, and Enterprise.",
};

const SPOTLIGHT = [
  {
    title: "The Evidence Ledger",
    tag: "The foundation everything else is built on",
    body: "Every commit and pull request is analyzed for tests added or missing, TODOs, dead code, call-graph context, and AI-vs-human authorship — each finding stored as a structured, timestamped Evidence Item tied to a file and a ticket key. Nothing here is a rolled-up summary you have to trust; every item is inspectable on its own.",
    mock: { label: "Evidence Item", lines: ["kind: test_added", "file: api_handler.go:88-104", "ticket: ENG-409", "confidence_contribution: +14"] },
  },
  {
    title: "Confidence Score",
    tag: "A number you can actually interrogate",
    body: "Every ticket gets a 0–100 score computed from its own Evidence Ledger, with a plain-English rationale sitting right next to it — 'Tests added for the new endpoint, but the error-handling branch has no coverage yet.' Click the score, see the evidence. There's no version of this feature where the number exists without the explanation.",
    mock: { label: "Confidence Score", lines: ["ticket: ENG-409", "score: 78 / 100", "rationale: tests added,", "  1 branch uncovered"] },
  },
  {
    title: "Claimed vs. Shipped",
    tag: "Mismatches, framed as questions",
    body: "When a ticket is marked Done but its Evidence Ledger doesn't back that up, VeriSprint doesn't silently downgrade the score or send an accusation — it raises a specific, answerable question in the standup: 'ENG-123 is Done — I don't see the tests landing, did those go in under a different commit?' Two-way transparency by default: developers see the exact same flag a PM sees.",
    mock: { label: "Reconciliation Flag", lines: ["type: claimed_not_shipped", "ticket: ENG-123", "question: tests missing —", "  different commit?"] },
  },
  {
    title: "AI Repo Chat",
    tag: "Ask your codebase a question",
    body: "Type a plain question — in Slack or the dashboard — like 'did we finish the checkout redesign this week?' and get an answer grounded in real commits and PRs, with citations back to the exact diffs. This turns VeriSprint from a dashboard you have to remember to check into an assistant you ask.",
    mock: { label: "Repo Chat", lines: ['Q: "did we ship checkout', '     redesign this week?"', "A: Yes — 6 commits, PR #412", "   merged Thu. [2 citations]"] },
  },
  {
    title: "Client Proof-of-Work Portal",
    tag: "For agencies and freelancers",
    body: "A branded, read-only, revocable link clients can check any time to see verified proof of what was delivered against what was billed — no codebase access, no shared login. This is the one feature in the category built for an audience outside engineering entirely: the people paying the invoice.",
    mock: { label: "Client Portal", lines: ["client: Acme Co", "period: Aug 1 – Aug 14", "delivered: 3 features,", "  2 bug fixes, verified"] },
  },
] as const;

type ProductFeature = { icon: typeof ShieldCheck; title: string; body: string };
type Product = {
  eyebrow: string;
  name: string;
  pitch: string;
  stat: { value: string; label: string };
  features: ProductFeature[];
};

// Framed as products, not a flat feature list — each one is a real reason
// a specific kind of buyer would connect a repo, not just a bucket for
// features that happened to share a theme.
const PRODUCTS: Product[] = [
  {
    eyebrow: "Product 1 of 6",
    name: "The Verification Engine",
    pitch: "The core judgment layer every other product here is built on top of — turns raw commits into a defensible, evidence-backed account of what's actually done.",
    stat: { value: "0–100", label: "Confidence Score, always with its rationale" },
    features: [
      { icon: ShieldCheck, title: "Evidence Ledger", body: "Every commit and PR analyzed for tests added, TODOs, dead code, and call-graph context — a structured, inspectable evidence item, not a summary." },
      { icon: Target, title: "Confidence Score", body: "A 0–100 score per ticket, computed from its real Evidence Ledger, with the rationale always visible next to the number." },
      { icon: Activity, title: "Code Health Signals", body: "A transparent health score built from real signal — tests added weighed against missing tests, dead code, and open TODOs — feeding directly into the Confidence Score. Our honest answer to \"durable change\" scoring: we don't claim to track line-survival across history, because we don't have that data to back it." },
      { icon: History, title: "Historical Accuracy", body: "Per person, per month: how often claimed progress actually held up against verified evidence, tracked over time." },
    ],
  },
  {
    eyebrow: "Product 2 of 6",
    name: "Team Intelligence",
    pitch: "The competitor-parity layer — the same DORA, allocation, and forecasting metrics Jellyfish/LinearB/Allstacks sell, computed here from the same real evidence instead of a second, separate data pipeline.",
    stat: { value: "4", label: "Standard DORA metrics, benchmarked against your own history" },
    features: [
      { icon: BarChart3, title: "DORA Metrics Panel", body: "Deployment frequency, lead time for changes, and the rest of the standard four DORA metrics, benchmarked against your own team's history." },
      { icon: Sparkles, title: "AI Contribution Tracker", body: "Detects self-disclosed AI assistance in commit messages (Co-Authored-By trailers, 'Generated with' lines) — real disclosure, not a behavioral guess." },
      { icon: Landmark, title: "Investment Allocation", body: "Commits and tickets tagged and rolled up by business initiative, so leadership can see where engineering time actually went." },
      { icon: FileCheck2, title: "Cost Capitalization Report", body: "Audit-ready R&D spend, classified by real title/description keywords and commit volume — dollar figures stay hidden until you configure a rate." },
      { icon: Wallet, title: "AI Tool Cost Tracking", body: "Log what you actually pay for Copilot, Cursor, Claude Code, and every other AI coding tool seat — normalized to a monthly figure and set next to the AI Contribution Tracker's real adoption signal, never a vendor comparison." },
      { icon: TrendingUp, title: "Delivery Forecast", body: "A statistical projection of a sprint's completion date from its own confidence-weighted velocity — a transparent trend line, not an opaque black-box model." },
      { icon: Waypoints, title: "Value Stream View", body: "Average time spent in each ticket status before moving to the next, computed only from real, tracked status transitions." },
    ],
  },
  {
    eyebrow: "Product 3 of 6",
    name: "Risk & Automation",
    pitch: "Catches the invisible failure modes no status meeting surfaces — quietly-grown scope, unlinked work, stalled reviews — before they show up as a missed deadline.",
    stat: { value: "3", label: "Detectors watching every push: drift, orphan work, stalled PRs" },
    features: [
      { icon: GitPullRequestArrow, title: "Ticket Drift Detector", body: "Catches when a ticket's real scope has silently grown in the code, without a corresponding re-estimation or ticket update." },
      { icon: Link2, title: "Orphan Commit Detector", body: "Surfaces real work that was done but never linked to a ticket, and offers a one-click retroactive link so the effort gets credited." },
      { icon: RadarIcon, title: "Risk Radar", body: "A proactive alert feed extending the drift and orphan detectors into an early warning system for slipping deadlines." },
      { icon: BellRing, title: "Blocker Nudge Bot", body: "Slack alerts when a PR or review has stalled, so stuck work gets unstuck before it becomes a missed sprint." },
      { icon: Radar, title: "Anomaly Check-In Nudges", body: "Detects unusual drops in a person's commit activity and gently suggests a check-in — framed around wellbeing, never performance." },
      { icon: GitPullRequestArrow, title: "PR AutoRoute", body: "Suggests reviewers based on who actually has recent commit history in the same files — not a guess at expertise." },
    ],
  },
  {
    eyebrow: "Product 4 of 6",
    name: "Communication & Reporting",
    pitch: "The same verification engine, translated for every audience that needs to hear it: developers who'd rather not retype their day, PMs who need a sprint rollup, investors who need one paragraph.",
    stat: { value: "7", label: "Report and digest types generated from one evidence source" },
    features: [
      { icon: MessagesSquare, title: "AI Repo Chat", body: "Ask your codebase questions in Slack or the dashboard, answered with citations back to the real evidence." },
      { icon: Plug, title: "MCP Server", body: "Connect Claude Desktop, Cursor, or any MCP-compatible client directly to your Evidence Ledger — query tickets, Confidence Scores, and Repo Chat from the AI tool you already work in, authenticated with a rotatable per-workspace token." },
      { icon: FileSliders, title: "Report Builder", body: "Pick exactly which real sections go into a report — shipped activity, cost capitalization, AI contribution, AI tool spend — deterministically assembled from the same evidence as every other report, no LLM rewrite step." },
      { icon: ClipboardList, title: "Auto-Drafted Standups", body: "A daily summary drafted from real commits for a developer to review and post — no typing from memory required." },
      { icon: Mail, title: "Slack & Email Digests", body: "A daily or weekly rollup delivered where the team already works, sourced from the same Evidence Ledger as everything else." },
      { icon: FileClock, title: "Visual Changelog", body: "Merged PRs and commits grouped by day into a real activity timeline — not a hand-curated release-notes page." },
      { icon: PieChart, title: "Investor Update Generator", body: "Auto-drafts the 'what we built' section of a monthly investor update, sourced from verified commit history, not memory." },
      { icon: FileText, title: "Onboarding Doc Generator", body: "Turns a codebase's real structure and recent history into living onboarding docs for new hires." },
      { icon: ChartNoAxesGantt, title: "Confidence-Weighted Burndown", body: "A sprint burndown built from real Confidence Score history, not self-reported percentages." },
    ],
  },
  {
    eyebrow: "Product 5 of 6",
    name: "Team Health",
    pitch: "The Swarmia-parity layer — developer experience signals correlated with real delivery data, and team norms that track themselves instead of living in a wiki nobody reads.",
    stat: { value: "100%", label: "Anonymous — no survey response is ever traceable to a person" },
    features: [
      { icon: HeartHandshake, title: "Pulse Surveys", body: "Short, genuinely anonymous developer-experience check-ins — no response is ever traceable back to a person, even in the audit log." },
      { icon: ScrollText, title: "Working Agreements", body: "Team-authored norms — PR size limits, review SLAs — written by the team, tracked automatically, never generated on their behalf." },
    ],
  },
  {
    eyebrow: "Product 6 of 6",
    name: "Enterprise & Compliance",
    pitch: "What a security review or a regulated-industry customer actually asks for — SSO, an audit trail, and the option to keep every byte of code on infrastructure you control.",
    stat: { value: "0", label: "Bytes of your code used to train any third-party model" },
    features: [
      { icon: KeyRound, title: "SSO / SCIM", body: "Enterprise single sign-on plus SCIM user provisioning for identity providers like Okta and Azure AD." },
      { icon: FileCheck2, title: "Compliance & Audit Trail", body: "An exportable, timestamped record tying every privileged action to its actor — for regulated industries that need to prove process." },
      { icon: Cable, title: "Open Integration Framework", body: "A consistent connect/disconnect/status lifecycle for integrations beyond GitHub and Slack — Linear, Jira, PagerDuty, Datadog, Opsgenie." },
      { icon: ServerCog, title: "Private / On-Prem LLM", body: "Point analysis at a self-hosted, OpenAI-compatible model instead of a third-party API — the same pipeline, on infrastructure you control." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Section
        variant="default"
        className="bg-[var(--background)] pb-16 border-b border-[var(--line)] relative overflow-hidden"
        background={
          <>
            <HeroBackground />
            <DotPattern className="opacity-40" />
          </>
        }
      >
        <PageHeader
          title="Six products. One evidence source."
          subtitle="Nothing here is a self-reported field. If VeriSprint shows you a number, it can show you the evidence behind it — five signature features below in depth, then all six product areas."
        />
      </Section>

      {/* Spotlight: the five features that make VeriSprint's own case, each
          given the heading + paragraph + proof treatment instead of a
          one-line card. */}
      <Section variant="default">
        <div className="mx-auto max-w-5xl space-y-16">
          {SPOTLIGHT.map((f, i) => (
            <Reveal key={f.title} delay={0.05 * i}>
              <div className={`flex flex-col gap-10 lg:flex-row lg:items-center ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider font-mono text-brand mb-3">{f.tag}</p>
                  <h3 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">{f.title}</h3>
                  <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)]">{f.body}</p>
                </div>
                <div className="flex-1 w-full">
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-md overflow-hidden font-mono">
                    <div className="bg-[var(--background)] border-b border-[var(--line)] px-4 py-2 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                      </div>
                      <span className="text-xs text-[var(--text-dim)] ml-2">{f.mock.label}</span>
                    </div>
                    <div className="p-5 space-y-1.5 text-sm text-[var(--text-muted)]">
                      {f.mock.lines.map((line, li) => (
                        <div key={li}>{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Six products */}
      <div>
        <Section variant="default" className="pb-0 bg-[var(--background)] border-y border-[var(--line)]">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">The full lineup</p>
            <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">Six products, framed around who needs them</h2>
            <p className="mt-4 text-[var(--text-muted)] text-lg leading-relaxed">
              Every feature below lives in exactly one of these — not because they&apos;re technically related, but
              because they answer the same buyer&apos;s question.
            </p>
          </Reveal>
        </Section>

        {PRODUCTS.map((product, i) => (
          <Section key={product.name} variant={i % 2 === 1 ? "sky" : "default"} className={i % 2 === 1 ? "border-y border-[var(--line)]" : ""}>
            <div className="mx-auto max-w-6xl">
              <Reveal className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end mb-10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider font-mono text-brand mb-3">{product.eyebrow}</p>
                  <h3 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">{product.name}</h3>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">{product.pitch}</p>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm lg:justify-self-end lg:w-full lg:max-w-xs">
                  <p className="text-4xl font-bold text-[var(--foreground)]">{product.stat.value}</p>
                  <p className="mt-2 text-sm text-[var(--text-dim)] leading-snug">{product.stat.label}</p>
                </div>
              </Reveal>

              <RevealGroup className={`grid gap-5 ${product.features.length > 4 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
                {product.features.map((item) => {
                  const accent = cardAccent(i);
                  return (
                    <RevealItem key={item.title}>
                      <div className="flex h-full gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
                          <item.icon className="h-4.5 w-4.5" strokeWidth={2} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--foreground)]">{item.title}</h4>
                          <p className="mt-1.5 text-sm text-[var(--text-muted)] leading-relaxed">{item.body}</p>
                        </div>
                      </div>
                    </RevealItem>
                  );
                })}
              </RevealGroup>
            </div>
          </Section>
        ))}
      </div>

      {/* FAQ */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Common questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">About the feature set</h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Do I need to enable every product above?",
                answer: "No. Team Intelligence, Risk & Automation (beyond the drift/orphan detectors), Team Health, and Enterprise features sit behind per-workspace feature flags, off by default — a Workspace Admin turns each one on individually as it's needed.",
              },
              {
                question: "Which of these work without a paid plan?",
                answer: "The Free tier includes the full Verification Engine (Evidence Ledger, Confidence Score, Claimed vs. Shipped), auto-drafted standups, and the Client Proof-of-Work Portal for one repo, indefinitely. See Pricing for what each paid tier unlocks.",
              },
              {
                question: "Is the Delivery Forecast a trained ML model?",
                answer: "No — it's a real statistical projection: a linear extrapolation of a sprint's own confidence-weighted velocity so far. VeriSprint doesn't yet have the volume of historical sprint data a trained model would need to avoid overfitting on a handful of examples, so this stays a transparent trend line rather than an opaque prediction, and says so.",
              },
              {
                question: "New here — where do I actually start?",
                answer: "The Help Center walks through connecting a repo and using VeriSprint day-to-day, with a separate guide for each role (PM, developer, agency owner, founder).",
              },
            ]}
          />
        </Reveal>
      </Section>

      <Section variant="default" className="bg-[var(--background)] border-t border-[var(--line)]">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">See it against your own commits</h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">Connect a repo — the Free tier has no time limit and no credit card.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL} className="inline-block">
              <ShimmerButton background="#4fb8c4" className="text-lg px-8 py-2">Connect a GitHub repo</ShimmerButton>
            </Link>
            <Link href="/docs" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              Not sure where to start? See the Help Center →
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
