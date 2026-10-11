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
  Radar,
  GitPullRequestArrow,
  Link2,
  BellRing,
  Workflow,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  Lock,
  GitMerge,
  UserCheck,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Risk & Automation — VeriSprint Platform",
  description:
    "Detect silent scope creep, unlinked orphan commits, and stalled reviews before deadlines slip. Safe PR workflow automation with strict branch protection guardrails.",
};

const RADAR_ALERTS = [
  {
    type: "drift",
    severity: "High",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    title: "Silent Scope Creep Detected on ENG-512",
    meta: "Branch: feat/payment-retry | Ticket: Refactor Stripe Webhooks",
    desc: "PR #318 modified 6 unexpected database migration files (+340 LOC) outside the original payment gateway boundary without an estimate update.",
    action: "Suggested Action: Re-estimate ticket or split DB changes into ENG-513",
  },
  {
    type: "orphan",
    severity: "Medium",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    title: "Unlinked Orphan Commits (6 Commits)",
    meta: "Author: @alex | Repo: acme/auth-service",
    desc: "Real engineering effort landed on main branch without a Jira or Linear issue link. Effort would otherwise go uncredited in sprint reports.",
    action: "1-Click Retroactive Link: Associate with ENG-520 (OAuth Security)",
  },
  {
    type: "blocker",
    severity: "Low",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    title: "Stalled Review Bottleneck on PR #284",
    meta: "Waiting on: @marcus | Idle Time: 52 Hours",
    desc: "PR touched core API handlers and has been waiting on first review. Blocker Nudge prepared for #team-core Slack channel.",
    action: "Slack Blocker Nudge Dispatched (gentle ping, not public shame)",
  },
];

const AUTOMATION_RULES = [
  {
    rule: "Auto-Label Missing Tests",
    trigger: "PR touches core business logic without test diffs",
    outcome: "Labels 'needs-tests' and highlights uncovered branches",
    safety: "Informs reviewer; does not block PR build",
  },
  {
    rule: "Auto-Label Security Sensitive",
    trigger: "Changes touch /auth, /billing, or migration scripts",
    outcome: "Labels 'security-review' and pings SecOps rotation",
    safety: "Ensures required signoffs before merge",
  },
  {
    rule: "Safe Non-Functional Auto-Approve",
    trigger: "Changes touch ONLY markdown docs, comments, or test mocks",
    outcome: "Adds 1 bot approval for low-risk busywork",
    safety: "Never bypasses branch protection or min reviewer counts",
  },
];

export default function RiskAutomationPage() {
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
            Product 3 of 6 — Early Warning & Safe Automation
          </p>
          <PageHeader
            title="Risk & Automation"
            subtitle="Catches the invisible failure modes no status meeting surfaces — quietly grown scope, unlinked work, stalled reviews — before they become missed deadlines, while automating PR busywork safely."
          />

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Real-Time Risk Detectors</span>
            <p className="text-5xl font-bold font-mono text-[var(--foreground)] mt-2">3 Watchers</p>
            <p className="mt-2 text-sm text-[var(--text-dim)] leading-snug">
              Continuous detectors watching every git push: drift, orphan work, and stalled PR reviews.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-base px-8 py-3">
                Enable Risk Detectors
              </ShimmerButton>
            </Link>
            <SecondaryButton href="#radar-feed">Inspect Live Risk Radar ↓</SecondaryButton>
          </div>
        </div>
      </Section>

      {/* Interactive Risk Radar Feed */}
      <Section variant="sky" id="radar-feed" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Early Warning System</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            The Proactive Risk Radar Feed
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Surfaces hidden risks days before standup retrospectives. Here is what an active sprint feed looks like:
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl space-y-5">
          {RADAR_ALERTS.map((alert) => (
            <Reveal key={alert.title}>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 md:p-7 shadow-sm hover:border-brand/40 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]/60">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold border rounded-md px-2.5 py-0.5 ${alert.badgeColor}`}>
                      {alert.severity} Priority
                    </span>
                    <h3 className="text-base font-bold text-[var(--foreground)]">{alert.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-[var(--text-dim)]">{alert.meta}</span>
                </div>

                <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed">{alert.desc}</p>

                <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--background)]/70 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-brand font-mono font-semibold">{alert.action}</span>
                  <button className="shrink-0 rounded-lg bg-brand/10 border border-brand/20 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-[#04201f] transition-all">
                    Resolve in 1-Click
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* PR AutoRoute & Code Ownership */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Intelligent Routing</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            PR AutoRoute: Real Git History, Not Titles
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Stop routing code reviews to whoever happens to be senior or listed in an outdated CODEOWNERS file. AutoRoute checks who actually committed code to the touched files recently.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--line)]">
            <div>
              <span className="text-xs font-mono text-[var(--text-dim)] uppercase">Pull Request #412</span>
              <h3 className="text-xl font-bold text-[var(--foreground)] mt-1">Refactor Redis Distributed Lock Pipeline</h3>
            </div>
            <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-mono text-brand font-bold">
              Suggested Reviewers (AST Context Match)
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center shrink-0">
                SC
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">@sarah (Staff Eng)</h4>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    94% File Match
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Authored 14 of the last 18 commits in `internal/lock/redis.go`. Deepest architectural context.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-5 flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">
                DL
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">@david (Backend Eng)</h4>
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                    78% File Match
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Recently merged PR #389 adding timeout retries in the same lock manager module.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* PR Workflow Automation Guardrails */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Safe Automation</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            PR Automation with Strict Guardrails
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Automate labels and safe non-functional changes without ever compromising security or branch protection.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl space-y-4">
          {AUTOMATION_RULES.map((rule) => (
            <div
              key={rule.rule}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="max-w-md">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-brand shrink-0" />
                  <h4 className="text-base font-bold text-[var(--foreground)]">{rule.rule}</h4>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1.5">
                  <strong className="text-[var(--foreground)]/80">Trigger:</strong> {rule.trigger}
                </p>
                <p className="text-xs text-brand font-medium mt-1">
                  <strong>Outcome:</strong> {rule.outcome}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 shrink-0 md:max-w-xs">
                <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase block mb-1">
                  Safety Guarantee
                </span>
                <p className="text-xs text-[var(--text-muted)] leading-snug">{rule.safety}</p>
              </div>
            </div>
          ))}

          {/* Safety Callout */}
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8 flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center shrink-0 mt-1">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[var(--foreground)]">Zero Branch Protection Bypass</h4>
              <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">
                VeriSprint automation can never override GitHub branch protection rules, dismiss required reviews, or bypass mandatory status checks. If a repo requires 2 human approvals, VeriSprint leaves that requirement 100% intact.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Feature Grid */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Full Feature Lineup</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Everything in Risk & Automation
          </h2>
        </Reveal>

        <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
              <GitPullRequestArrow className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Ticket Drift Detector</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Catches when a ticket&apos;s real scope quietly expands in the code without a re-estimation or ticket update.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <Link2 className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Orphan Commit Detector</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Surfaces real work that was pushed without a ticket link, offering a 1-click retroactive link so effort gets credited.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
              <Radar className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Risk Radar</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              A proactive alert feed extending drift and orphan detectors into an early warning system for slipping deadlines.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <BellRing className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Blocker Nudge Bot</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Gentle Slack pings when a PR or review has stalled, so stuck work gets unstuck before it becomes a missed sprint.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <UserCheck className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">PR AutoRoute</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Suggests reviewers based on who actually has recent commit history in the touched files, not static guess lists.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <Workflow className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">PR Workflow Automation</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Auto-labels PRs the moment they open and safely auto-approves narrow non-functional changes like documentation.
            </p>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Common Questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            About Risk & Automation
          </h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Can PR AutoRoute assign reviewers automatically?",
                answer:
                  "Yes, if configured. By default it suggests reviewers in the PR comment or Slack notification. When auto-assignment is enabled, it adds requested reviewers directly to the GitHub PR thread.",
              },
              {
                question: "How does the Ticket Drift Detector know scope expanded?",
                answer:
                  "When an engineer marks a ticket in progress, VeriSprint scans the ticket acceptance criteria and initial diff. If later commits introduce new database schemas or unrelated services without an updated ticket description or estimate, drift is flagged.",
              },
              {
                question: "Does the Blocker Nudge Bot spam public channels?",
                answer:
                  "No. Nudges are sent as direct Slack messages or threaded replies to the assigned reviewer after a customizable idle threshold (default: 36 business hours).",
              },
              {
                question: "What permissions does PR Workflow Automation need?",
                answer:
                  "Auto-labeling and auto-reviewing require the GitHub App 'Pull requests: Write' permission. This feature is off by default and requires explicit permission acceptance by a repository administrator.",
              },
            ]}
          />
        </Reveal>
      </Section>

      <PlatformPagination currentSlug="risk-automation" />

      {/* CTA */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
            Stop Silent Scope Creep Before Sprint End
          </h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">
            Turn on continuous risk detection for your connected repositories today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-lg px-8 py-2">
                Connect GitHub Repo
              </ShimmerButton>
            </Link>
            <Link href="/pricing" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              Compare Features & Plans →
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
