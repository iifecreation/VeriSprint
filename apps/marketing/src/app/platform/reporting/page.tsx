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
  MessagesSquare,
  Plug,
  FileSliders,
  ClipboardList,
  Mail,
  FileClock,
  PieChart,
  FileText,
  ChartNoAxesGantt,
  Terminal,
  Send,
  Building,
  CheckCircle2,
  Share2,
  ExternalLink,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Communication & Reporting — VeriSprint Platform",
  description:
    "Auto-drafted standups, AI Repo Chat with evidence citations, MCP server integration for Cursor & Claude, client proof-of-work portals, and investor update generators.",
};

const AUDIENCES = [
  {
    role: "For Software Engineers",
    format: "Auto-Drafted Standups & Living Docs",
    desc: "Drafts yesterday’s standup update from verified commits in one click. Zero typing from memory; onboarding docs generated automatically from recent PRs.",
  },
  {
    role: "For Engineering Leadership",
    format: "Confidence-Weighted Burndowns & Digests",
    desc: "Daily Slack & Email rollups across all services, plus burndown charts weighted by real Confidence Scores rather than self-reported percentages.",
  },
  {
    role: "For Founders & Investors",
    format: "Monthly Investor Update Generator",
    desc: "Auto-drafts the 'What We Built' narrative for your monthly investor newsletter, translated into plain business terms directly from verified code history.",
  },
  {
    role: "For Agencies & Clients",
    format: "Client Proof-of-Work Portal",
    desc: "A branded, read-only, revocable link clients can check at any time to verify delivered features against billed invoices — with zero repo access.",
  },
];

export default function CommunicationReportingPage() {
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
            Product 4 of 6 — Multi-Audience Translation
          </p>
          <PageHeader
            title="Communication & Reporting"
            subtitle="The same verification engine translated for every audience that needs to hear it: developers who hate typing standups, PMs tracking sprint progress, investors needing one summary paragraph, and AI agents querying codebase context."
          />

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Synthesized Outputs</span>
            <p className="text-5xl font-bold font-mono text-[var(--foreground)] mt-2">7 Formats</p>
            <p className="mt-2 text-sm text-[var(--text-dim)] leading-snug">
              Report and digest types generated from one underlying Evidence Ledger — no LLM hallucinations.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-base px-8 py-3">
                Try Auto-Drafted Standups
              </ShimmerButton>
            </Link>
            <SecondaryButton href="#repo-chat">Explore AI Repo Chat & MCP ↓</SecondaryButton>
          </div>
        </div>
      </Section>

      {/* Interactive AI Repo Chat & MCP */}
      <Section variant="sky" id="repo-chat" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Conversational Ground Truth</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            AI Repo Chat & MCP Server
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Ask your codebase plain questions in Slack, the dashboard, or directly inside Cursor and Claude Desktop via our Model Context Protocol (MCP) server.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl grid gap-8 lg:grid-cols-2 items-stretch">
          {/* Repo Chat Demo */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-4 border-b border-[var(--line)] text-xs font-mono text-[var(--text-dim)]">
                <MessagesSquare className="h-4 w-4 text-brand" />
                <span>AI Repo Chat (Slack / Web Dashboard)</span>
              </div>

              {/* Chat Thread */}
              <div className="mt-4 space-y-4 text-xs font-mono">
                {/* User Message */}
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center shrink-0">
                    PM
                  </div>
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--background)] p-3.5 text-[var(--foreground)]">
                    &ldquo;Did we finish the Stripe idempotency refactor this sprint?&rdquo;
                  </div>
                </div>

                {/* Assistant Response */}
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-brand text-[#04201f] font-bold flex items-center justify-center shrink-0">
                    VS
                  </div>
                  <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-[var(--foreground)] space-y-2">
                    <p className="font-bold text-brand">Yes — verified in PR #312.</p>
                    <p className="text-[var(--text-muted)] leading-relaxed">
                      Merged by @sarah yesterday at 3:42 PM. 4 unit tests added in <span className="text-[var(--foreground)]">webhook_handler_test.go</span> with verified call-graph integration into Postgres.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-[10px]">
                      <span className="rounded bg-[var(--surface)] px-2 py-0.5 border border-[var(--line)] text-brand">
                        Confidence Score: 88/100
                      </span>
                      <span className="rounded bg-[var(--surface)] px-2 py-0.5 border border-[var(--line)] text-[var(--text-dim)]">
                        Diff: +184 / -22 LOC
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center gap-2 text-xs text-[var(--text-dim)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Grounded in pgvector semantic search over immutable Evidence Ledger</span>
            </div>
          </div>

          {/* MCP Server Integration */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] text-xs font-mono">
                <div className="flex items-center gap-2 text-[var(--text-dim)]">
                  <Plug className="h-4 w-4 text-brand" />
                  <span>Model Context Protocol (MCP)</span>
                </div>
                <span className="rounded-full bg-brand/10 text-brand px-2 py-0.5 text-[10px] font-bold">
                  Cursor &amp; Claude
                </span>
              </div>

              <h3 className="text-lg font-bold text-[var(--foreground)] mt-4">
                Connect Directly into Cursor & Claude Desktop
              </h3>
              <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                Query your workspace&apos;s tickets, Confidence Scores, and code evidence from the AI agent you already code in, authenticated via rotatable token.
              </p>

              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--background)] p-4 font-mono text-xs text-[var(--foreground)]/80 overflow-x-auto">
                <p className="text-[var(--text-dim)] mb-1">// ~/.cursor/mcp.json</p>
                <pre>
{`{
  "mcpServers": {
    "verisprint": {
      "command": "npx",
      "args": ["-y", "@verisprint/mcp-server"],
      "env": {
        "VERISPRINT_TOKEN": "vs_live_948f..."
      }
    }
  }
}`}
                </pre>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--line)] text-xs text-brand font-mono font-semibold">
              Supports: query_ticket_evidence, get_confidence_score, ask_repo_chat
            </div>
          </div>
        </div>
      </Section>

      {/* Audience Translation Matrix */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Multi-Stakeholder Sync</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Tailored Reporting for Every Audience
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            One single evidence stream, formatted appropriately for four distinct stakeholders.
          </p>
        </Reveal>

        <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2">
          {AUDIENCES.map((aud, i) => (
            <Reveal key={aud.role} delay={0.06 * i}>
              <div className="h-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-7 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-brand font-bold">{aud.role}</span>
                  <h3 className="text-xl font-bold text-[var(--foreground)] mt-2">{aud.format}</h3>
                  <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">{aud.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Client Proof of Work Portal Spotlight */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-4xl text-center mb-12">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">For Agencies & Consultancies</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Client Proof-of-Work Portal
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            The only feature in the category built for the person paying the invoice. Provide clients with an unguessable, read-only link proving delivered milestones without sharing source code access.
          </p>
        </Reveal>

        <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--line)] gap-4">
            <div>
              <span className="text-xs font-mono text-[var(--text-dim)] uppercase">Client Verification Portal</span>
              <h3 className="text-xl font-bold text-[var(--foreground)] mt-1">Acme Corp — Milestone Delivery Rollup</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand/10 border border-brand/20 px-3 py-1 text-xs font-mono text-brand font-bold">
                Tokenized Read-Only Link
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3 text-center">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-4">
              <span className="text-xs text-[var(--text-dim)] block">Delivered Features</span>
              <span className="text-3xl font-bold font-mono text-brand mt-1 block">6 Features</span>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-4">
              <span className="text-xs text-[var(--text-dim)] block">Confidence Level</span>
              <span className="text-3xl font-bold font-mono text-emerald-400 mt-1 block">96% High</span>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-4">
              <span className="text-xs text-[var(--text-dim)] block">Invoice Alignment</span>
              <span className="text-3xl font-bold font-mono text-[var(--foreground)] mt-1 block">100% Backed</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--text-dim)]">
            <span>Clients see plain-English delivered capabilities — zero git diffs or internal comments exposed.</span>
            <span className="text-brand font-mono font-semibold">Revocable at any time</span>
          </div>
        </div>
      </Section>

      {/* Feature Grid */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Feature Lineup</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Everything in Communication & Reporting
          </h2>
        </Reveal>

        <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">AI Repo Chat</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Ask your codebase questions in Slack or the web dashboard, answered with citations back to real commits.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <Plug className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">MCP Server</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Connect Cursor or Claude Desktop directly to your Evidence Ledger via rotatable workspace token.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Auto-Drafted Standups</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              A daily summary drafted from real commits for developers to review and post without typing from memory.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <FileClock className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Visual Changelog</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Merged PRs and commits grouped by day into an automatic activity timeline, not a manually written page.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <PieChart className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Investor Update Generator</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Auto-drafts the &ldquo;what we built&rdquo; section of investor updates, sourced from verified commits.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Onboarding Doc Generator</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Turns codebase structure and recent git history into living onboarding documentation for new hires.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
              <ChartNoAxesGantt className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Confidence Burndown</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              A sprint burndown built from real Confidence Score history rather than self-reported completion percentages.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-blue-400/10 text-blue-300 flex items-center justify-center mb-3">
              <FileSliders className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Modular Report Builder</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Pick exactly which sections go into custom executive reports, deterministically assembled without LLM drift.
            </p>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Common Questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            About Communication & Reporting
          </h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Does AI Repo Chat send code to public OpenAI or Anthropic models?",
                answer:
                  "By default, queries are processed with strict zero-data-retention APIs. Enterprise workspaces can point Repo Chat at private, VPC-hosted models (such as vLLM or Ollama) so no data ever leaves internal infrastructure.",
              },
              {
                question: "Can developers edit their standup before posting to Slack?",
                answer:
                  "Yes. Standups are auto-drafted as suggestions. Developers can review, edit, or append personal notes in the web dashboard or via Slack ephemeral message before publishing.",
              },
              {
                question: "How does the Client Portal ensure proprietary code isn't exposed?",
                answer:
                  "The Client Portal renders high-level milestone descriptions, verified test passing statuses, and delivery dates. Raw git diffs, commit hashes, and internal code comments are completely scrubbed.",
              },
            ]}
          />
        </Reveal>
      </Section>

      <PlatformPagination currentSlug="reporting" />

      {/* CTA */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
            Automate Standups and Stakeholder Reporting
          </h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">
            Connect a repo — free tier includes standup drafting and the Client Portal.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL}>
              <ShimmerButton background="#4fb8c4" className="text-lg px-8 py-2">
                Get Started Free
              </ShimmerButton>
            </Link>
            <Link href="/pricing" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              View Pricing Tiers →
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
