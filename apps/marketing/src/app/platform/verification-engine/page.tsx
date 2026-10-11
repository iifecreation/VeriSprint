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
  ShieldCheck,
  Target,
  Activity,
  History,
  CheckCircle2,
  FileCode2,
  GitCommit,
  GitPullRequest,
  Check,
  HelpCircle,
  TrendingUp,
  FileText,
  AlertTriangle,
  Flame,
  Code2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Verification Engine — VeriSprint Platform",
  description:
    "Turn raw git commits into a defensible, evidence-backed account of what is actually built. 0–100 Confidence Scores with transparent rationale and inspectable Evidence Ledgers.",
};

const EVIDENCE_ITEMS = [
  {
    kind: "test_added",
    badge: "+28 pts",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    file: "webhook_handler_test.go:42-118",
    title: "Unit & Idempotency Tests Added",
    desc: "4 new test cases covering replay attack prevention, exponential backoff, and duplicate webhook header handling.",
    code: "func TestHandleWebhook_DuplicateIdempotencyKey(t *testing.T) {\n  // Verifies duplicate payload returns HTTP 200 without DB double-write\n  resp := server.PostWebhook(duplicateEventPayload)\n  assert.Equal(t, http.StatusOK, resp.Code)\n}",
  },
  {
    kind: "call_graph_verified",
    badge: "+24 pts",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    file: "internal/billing/dispatcher.go:88",
    title: "Call-Graph Integration Confirmed",
    desc: "Verified that WebhookProcessor.DispatchEvent() calls RecordEventIdempotency() in persistent Postgres store.",
    code: "err := s.db.WithTransaction(ctx, func(tx *sql.Tx) error {\n  return tx.RecordEventIdempotency(event.ID, event.Timestamp)\n})",
  },
  {
    kind: "no_dead_code",
    badge: "+18 pts",
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    file: "internal/billing/models.go:12-40",
    title: "Clean Structural Health (No Dead Code)",
    desc: "AST traversal confirmed all declared struct fields, channels, and error branches are active and consumed.",
    code: "type WebhookEvent struct {\n  ID        string    `json:\"id\"`\n  Attempts  int       `json:\"attempts\"`\n  // Zero orphaned attributes detected\n}",
  },
  {
    kind: "open_todo",
    badge: "-6 pts",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    file: "internal/billing/dispatcher.go:142",
    title: "Open TODO in Error Fallback Path",
    desc: "Unresolved TODO marker found in the Redis queue fallback handler, reducing confidence score slightly.",
    code: "// TODO(marcus): add distributed lock fallback if Redis replica lags\nlog.Warn(\"Proceeding with primary DB lock\")",
  },
];

const FORMULA_PILLARS = [
  {
    title: "Test Coverage & Resilience",
    weight: "35% of score",
    desc: "Weighs tests added against missing test cases across new execution branches. Tests touching error handling and boundary conditions receive higher confidence weight.",
  },
  {
    title: "Integration & Call Graph",
    weight: "25% of score",
    desc: "Verifies that newly written functions are actually invoked by callers in the application's runtime graph, preventing isolated 'orphan' code that never executes.",
  },
  {
    title: "Code Health & Debt Penalties",
    weight: "20% of score",
    desc: "Evaluates dead code, unreachable branches, and unresolved TODO markers left in new files. Keeps confidence grounded in operational readiness.",
  },
  {
    title: "Acceptance Criteria Alignment",
    weight: "20% of score",
    desc: "Compares file changes, endpoint signatures, and database schemas with the ticket's stated acceptance criteria to ensure the PR delivered what was requested.",
  },
];

export default function VerificationEnginePage() {
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
            Product 1 of 6 — The Core Foundation
          </p>
          <PageHeader
            title="The Verification Engine"
            subtitle="The judgment layer every other product is built on — turns raw git commits into a defensible, evidence-backed account of what is actually done."
          />

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Confidence Score Metric</span>
            <p className="text-5xl font-bold font-mono text-[var(--foreground)] mt-2">0–100</p>
            <p className="mt-2 text-sm text-[var(--text-dim)] leading-snug">
              Every ticket gets a score computed from its real Evidence Ledger, with the rationale always visible next to the number.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-base px-8 py-3">
                Verify Your First Ticket
              </ShimmerButton>
            </Link>
            <SecondaryButton href="#interactive-ledger">Inspect Live Ledger ↓</SecondaryButton>
          </div>
        </div>
      </Section>

      {/* Interactive Evidence Ledger Inspection */}
      <Section variant="sky" id="interactive-ledger" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Inspectable Ground Truth</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Inside the Evidence Ledger
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Click through a real ticket’s Evidence Ledger. Every judgment is linked to a file, line range, and AST rationale. No black-box estimations.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl overflow-hidden">
          {/* Ticket Header Bar */}
          <div className="bg-[var(--background)] border-b border-[var(--line)] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-brand/15 px-2.5 py-1 text-xs font-mono font-bold text-brand">
                  ENG-409
                </span>
                <span className="text-xs text-[var(--text-dim)] font-mono">repo: acme/billing-service</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold">
                  PR #312 Merged
                </span>
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)] mt-2">
                Implement Stripe Webhook Idempotency & Retries
              </h3>
            </div>

            <div className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--line)] rounded-xl px-5 py-3 shrink-0">
              <div className="text-right">
                <span className="block text-[11px] font-mono text-[var(--text-dim)] uppercase">Confidence Score</span>
                <span className="block text-2xl font-bold font-mono text-brand">88 / 100</span>
              </div>
              <div className="h-10 w-10 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-sm">
                88%
              </div>
            </div>
          </div>

          {/* Evidence Items Breakdown */}
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]/60">
              <h4 className="text-sm font-mono uppercase tracking-wider text-[var(--text-dim)]">
                Structured Evidence Items (4 Discovered)
              </h4>
              <span className="text-xs text-brand font-mono font-semibold">Net Confidence Rationale: +88 pts</span>
            </div>

            <div className="space-y-4">
              {EVIDENCE_ITEMS.map((item) => (
                <div
                  key={item.file}
                  className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-5 hover:border-brand/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <FileCode2 className="h-4 w-4 text-brand shrink-0" />
                      <span className="text-sm font-bold text-[var(--foreground)]">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--text-dim)]">{item.file}</span>
                      <span className={`text-xs font-mono font-bold border rounded-md px-2 py-0.5 ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-3">{item.desc}</p>
                  <pre className="rounded-lg bg-[var(--surface)]/90 p-3 font-mono text-xs text-[var(--foreground)]/80 overflow-x-auto border border-[var(--line)]/50">
                    <code>{item.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* The Confidence Formula */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Transparent Math</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            The Confidence Formula Explained
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Other tools display an arbitrary &ldquo;health score&rdquo; without showing the arithmetic. VeriSprint publishes the exact weightings behind every calculation.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
          {FORMULA_PILLARS.map((col, idx) => (
            <Reveal key={col.title} delay={0.05 * idx}>
              <div className="h-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">Pillar 0{idx + 1}</span>
                    <span className="rounded-full bg-brand/10 border border-brand/20 px-2.5 py-0.5 text-xs font-mono font-bold text-brand">
                      {col.weight}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--foreground)]">{col.title}</h3>
                  <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">{col.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Honest Disclosure Callout */}
        <div className="mx-auto max-w-5xl mt-12">
          <div className="rounded-2xl border border-[var(--line)] bg-brand/5 p-6 md:p-8 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center shrink-0 mt-1">
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-base font-bold text-[var(--foreground)]">Our Honest Stance on &ldquo;Durable Change&rdquo; Scoring</h4>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                Many legacy tools claim to calculate &ldquo;durable change&rdquo; by tracking whether lines of code survive in git blame over 2 years. We don&apos;t make that claim: line-survival across history is mathematically flawed without semantic AST diffs (simple renames or lint formatters wipe it out), and it perversely penalizes engineers who refactor dead code. VeriSprint evaluates structural tests, call-graph integration, and debt markers in the real diff today.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Claimed vs Shipped & Accuracy */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Say vs. Show</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Claimed vs. Shipped Reconciliation
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            When a ticket is marked Done in Jira or Linear but the git commits don&apos;t back it up, VeriSprint raises a constructive question, never an accusation.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-8 md:grid-cols-2">
          {/* Mismatch Flag Example */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7">
            <div className="flex items-center gap-2 text-amber-400 mb-4">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Constructive Mismatch Flag</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">Two-Way Standup Reconciliation</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Developers see the exact same question PMs see:
            </p>

            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs font-mono text-[var(--foreground)] space-y-2">
              <p className="text-amber-300 font-bold">Question raised in #team-core standup:</p>
              <p className="text-[var(--text-muted)] leading-relaxed">
                &ldquo;ENG-123 is marked Done by @alex — but I don&apos;t see test assertions in commit a8f41e. Did those tests land under a separate pull request?&rdquo;
              </p>
              <div className="pt-2 flex gap-2">
                <span className="rounded bg-[var(--surface)] px-2 py-1 text-[11px] text-brand border border-[var(--line)]">
                  1-Click Answer: &ldquo;Yes, landed in PR #314&rdquo;
                </span>
              </div>
            </div>
          </div>

          {/* Historical Accuracy */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7">
            <div className="flex items-center gap-2 text-brand mb-4">
              <History className="h-5 w-5" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">Reliability Tracking</span>
            </div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">Historical Accuracy Over Time</h3>
            <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
              Per squad, per month: how often claimed progress held up against verified evidence.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">Payments Squad (Rolling 90d)</span>
                <span className="text-brand font-bold">94.2% verified</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--background)] overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: "94.2%" }} />
              </div>

              <div className="flex items-center justify-between text-xs font-mono pt-2">
                <span className="text-[var(--text-muted)]">Platform Squad (Rolling 90d)</span>
                <span className="text-emerald-400 font-bold">98.1% verified</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--background)] overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: "98.1%" }} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Feature Grid */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Feature Lineup</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Everything in The Verification Engine
          </h2>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[var(--foreground)]">Evidence Ledger</h4>
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Every commit and PR analyzed for tests, TODOs, dead code, and call-graph context — a structured, inspectable evidence item, not a hand-written summary.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <Target className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[var(--foreground)]">Confidence Score</h4>
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              A 0–100 score per ticket, computed from its real Evidence Ledger, with the plain-English rationale always visible next to the number.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[var(--foreground)]">Code Health Signals</h4>
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              A transparent health score built from real signal — tests added weighed against missing tests, dead code, and open TODOs — feeding directly into the Confidence Score.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                <History className="h-5 w-5" />
              </div>
              <h4 className="text-base font-bold text-[var(--foreground)]">Historical Accuracy</h4>
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Per person, per month: how often claimed progress actually held up against verified evidence, tracked over time without blame culture.
            </p>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Common Questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            About The Verification Engine
          </h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Is this engine on by default for every repo?",
                answer:
                  "Yes. The Verification Engine is the foundational layer of VeriSprint. When you install the GitHub App, every connected repo gets automated Evidence Ledgers, Confidence Scoring, and Claimed vs. Shipped reconciliation immediately on the Free tier.",
              },
              {
                question: "What languages does the AST parser support?",
                answer:
                  "VeriSprint includes native AST parsers for TypeScript, JavaScript, Python, Go, Rust, Java, C#, Ruby, PHP, Swift, and Kotlin, with fallback universal diff parsers for all other file types.",
              },
              {
                question: "Can an engineer contest a confidence score?",
                answer:
                  "Yes. In the standup digest or dashboard, an engineer can click 'Link Additional Evidence' to associate a separate test PR, an external CI run link, or an architectural RFC, instantly recalculating the score.",
              },
              {
                question: "Does this require write access to our GitHub repositories?",
                answer:
                  "No. The Verification Engine operates entirely on read-only permissions (Contents: Read-only, Metadata: Read-only, Pull requests: Read-only). It cannot push code, modify branches, or delete files.",
              },
            ]}
          />
        </Reveal>
      </Section>

      <PlatformPagination currentSlug="verification-engine" />

      {/* CTA */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
            See the Evidence Ledger on Your Own Commits
          </h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">
            Connect a repo — the Free tier has no time limit and requires no credit card.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-lg px-8 py-2">
                Connect a GitHub Repo
              </ShimmerButton>
            </Link>
            <Link href="/docs" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              Read Verification Docs →
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
