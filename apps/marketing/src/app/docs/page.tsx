import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section, FAQSection } from "@/components/ui";
import { INSTALL_URL, LOGIN_URL } from "@/lib/config";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import {
  UserPlus,
  PlugZap,
  GitCommitHorizontal,
  UsersRound,
  LayoutDashboard,
  ClipboardCheck,
  Code2,
  Building2,
  Landmark,
  ShieldCheck,
  KeyRound,
  Cable,
  ServerCog,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Help Center — VeriSprint",
  description: "How to connect a repo, invite your team, and use VeriSprint day-to-day — a real step-by-step flow, plus a separate guide for each role.",
};

const GETTING_STARTED = [
  {
    icon: UserPlus,
    title: "1. Create your account",
    body: "Sign in with GitHub OAuth (the primary path) — or, if a teammate already invited you, use the link in that email to set a password instead. Either way lands you in the same dashboard.",
  },
  {
    icon: PlugZap,
    title: "2. Install the GitHub App & pick repos",
    body: "Click \"Connect a repo\" and you're sent straight to GitHub's own install screen — VeriSprint never sees your GitHub password. Approve read-only access (Contents, Metadata, Pull Requests) and choose which repos to connect; you can add more later.",
  },
  {
    icon: GitCommitHorizontal,
    title: "3. Watch your first Evidence Ledger appear",
    body: "Nothing is backfilled retroactively — the first Evidence Items show up on the next push to a connected repo. Push something small to see it happen, or just wait for your team's normal activity.",
  },
  {
    icon: UsersRound,
    title: "4. Invite your team",
    body: "From Settings → Team, enter a teammate's email and pick a role (Developer, Manager, or Workspace Admin) — they get a one-time email link to set a password and join. No shared logins.",
  },
  {
    icon: LayoutDashboard,
    title: "5. Find your way around",
    body: "PM Dashboard for the team-wide claimed-vs-shipped view, Developer View for your own Evidence Ledger, Sprints for burndown, Insights/Analytics for the deeper metrics — see the role guides below for what to look at first.",
  },
] as const;

const ROLE_GUIDES = [
  {
    icon: ClipboardCheck,
    role: "Product Managers",
    start: "PM Dashboard",
    body: "Start on the Dashboard to see claimed-vs-shipped across the whole team at a glance. When something's flagged, click into the ticket to see the exact evidence behind the question — never just a bare accusation. Reports gives you sprint rollups and stakeholder-facing summaries; Insights and Analytics add DORA, risk, and forecasting once your Super Admin turns those on.",
  },
  {
    icon: Code2,
    role: "Developers",
    start: "Developer View",
    body: "Developer View shows your own Evidence Ledger — the same evidence a PM would see about your work, nothing hidden. Standups auto-drafts your daily update from real commits for you to review and post. Repo Chat lets you (or anyone) ask the codebase a plain question and get a cited answer.",
  },
  {
    icon: Building2,
    role: "Agency Owners",
    start: "Reports → Client Portal",
    body: "Generate a Client Proof-of-Work Portal report from Reports, then share the link it gives you — clients see verified delivered work against what was billed, with no codebase access and no shared login. Revoke a link any time from the same page.",
  },
  {
    icon: Landmark,
    role: "Founders & Execs",
    start: "Reports → Investor Update",
    body: "The Investor Update Generator drafts the \"what we built\" section of a monthly update from real commit history — review and edit before sending, same as any other draft here. ROI shows time saved from replacing live standups with the auto-drafted async version.",
  },
  {
    icon: ShieldCheck,
    role: "Workspace Admins",
    start: "Settings",
    body: "Settings is where billing-adjacent config lives: white-label branding for the Client Portal, Team (invite/remove people, change roles), Integrations, and SSO/SCIM for Enterprise. You're also the one who can request Phase 2/3 features (DORA, Analytics, Pulse Surveys, and the rest) get turned on for your workspace.",
  },
] as const;

export default function DocsPage() {
  return (
    <>
      <Section variant="default" className="bg-slate-50 pb-16 pt-20 border-b border-slate-200 relative overflow-hidden">
        <DotPattern className="opacity-60" />
        <PageHeader
          eyebrow="Help Center"
          title="How to actually connect and use VeriSprint."
          subtitle="A real step-by-step flow, not a feature list — start here, then jump to the guide for your role."
        />
      </Section>

      {/* Getting started — the numbered flow */}
      <Section>
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Start here</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">From nothing to your first Evidence Ledger</h2>
        </Reveal>
        <div className="mx-auto max-w-3xl relative">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-blue-100 hidden md:block" />
          <div className="space-y-6 relative">
            {GETTING_STARTED.map((step) => (
              <Reveal key={step.title}>
                <div className="flex gap-6 md:gap-8">
                  <div className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-full bg-white border border-brand/20 items-center justify-center shadow-sm relative z-10 text-brand">
                    <step.icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal className="mx-auto mt-10 max-w-3xl text-center">
          <Link href={INSTALL_URL} className="inline-block">
            <ShimmerButton background="#001666" className="text-base px-8 py-2">Connect a GitHub repo</ShimmerButton>
          </Link>
          <p className="mt-3 text-sm text-slate-400">
            Already have a workspace? <a href={LOGIN_URL} className="text-brand underline">Sign in</a> instead.
          </p>
        </Reveal>
      </Section>

      {/* Role guides */}
      <Section variant="default" className="bg-slate-50 border-y border-slate-200">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Guides by role</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">Where to look first, for you specifically</h2>
        </Reveal>
        <RevealGroup className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ROLE_GUIDES.map((g) => (
            <RevealItem key={g.role}>
              <MagicCard className="flex h-full flex-col">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-neon)]/15 text-[#3f6212]">
                  <g.icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{g.role}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Start at: {g.start}</p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed flex-1">{g.body}</p>
              </MagicCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Account help */}
      <Section>
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Account help</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">Sign-in, invites, and access</h2>
        </Reveal>
        <RevealGroup className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          <RevealItem>
            <MagicCard className="h-full">
              <h3 className="text-base font-bold text-slate-900">Forgot your password?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Use <a href={`${LOGIN_URL.replace("/login", "/forgot-password")}`} className="text-brand underline">the reset link</a> on
                the sign-in page. You&apos;ll always see the same &ldquo;check your email&rdquo; message whether or not that address has
                an account — that&apos;s intentional, so the response itself can&apos;t be used to check who has an account here.
              </p>
            </MagicCard>
          </RevealItem>
          <RevealItem>
            <MagicCard className="h-full">
              <h3 className="text-base font-bold text-slate-900">Invite link expired or missing?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Invite links expire after 7 days. Ask whoever invited you (a Workspace Admin) to send a new one from Settings → Team — it
                takes one click and doesn&apos;t affect your existing account if you already started setting one up.
              </p>
            </MagicCard>
          </RevealItem>
          <RevealItem>
            <MagicCard className="h-full">
              <h3 className="text-base font-bold text-slate-900">Wrong role, or need access removed?</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                A Workspace Admin can change anyone&apos;s role or remove them entirely from Settings → Team — role changes end that
                person&apos;s active session immediately, so a demoted account can&apos;t keep using elevated access until they log back in.
              </p>
            </MagicCard>
          </RevealItem>
          <RevealItem>
            <MagicCard className="h-full">
              <h3 className="text-base font-bold text-slate-900">Client Portal link, not a full account</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                If you&apos;re a client checking delivered work, you don&apos;t need any of the above — you were sent a direct portal
                link, which needs no sign-in and shows only that one report.
              </p>
            </MagicCard>
          </RevealItem>
        </RevealGroup>
      </Section>

      {/* Enterprise / integration extras */}
      <Section variant="default" className="bg-slate-50 border-y border-slate-200">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Beyond the basics</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">Integrations, SSO, and self-hosting</h2>
        </Reveal>
        <RevealGroup className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2">
          <RevealItem>
            <MagicCard className="h-full">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-brand">
                <Cable className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Open Integration Framework</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                From Settings, a Workspace Admin can register a connection for Linear, Jira, PagerDuty, Datadog, or Opsgenie — this is
                genuinely scaffolding today: it stores the config with a consistent connect/disconnect lifecycle and audit trail for a
                future sync job to build on, rather than performing a live OAuth handshake right now. Manual ticket entry works without it.
              </p>
            </MagicCard>
          </RevealItem>
          <RevealItem>
            <MagicCard className="h-full">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-brand">
                <KeyRound className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
              <h3 className="text-base font-bold text-slate-900">SSO &amp; SCIM (Enterprise)</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                A Workspace Admin configures OIDC single sign-on and generates a SCIM provisioning token from Settings → SSO &amp; SCIM —
                once set, your identity provider (Okta, Azure AD, etc.) can drive account creation and deactivation directly.
              </p>
            </MagicCard>
          </RevealItem>
          <RevealItem>
            <MagicCard className="h-full sm:col-span-2">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-brand">
                <ServerCog className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Self-hosting the LLM analysis</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Set <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">LLM_PROVIDER=openai_compatible</code> and point{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">ON_PREM_LLM_BASE_URL</code> at any OpenAI-compatible server
                (vLLM, Ollama, LM Studio, text-generation-webui) to keep every commit and diff on infrastructure you control — the same
                analysis pipeline, no third-party API call for any of it.
              </p>
            </MagicCard>
          </RevealItem>
        </RevealGroup>
      </Section>

      {/* FAQ */}
      <Section>
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Still stuck?</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">Frequently asked</h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "I connected a repo but don't see any data yet.",
                answer: "Nothing is backfilled retroactively — evidence only starts appearing from the next push after you connect. If it's been a while since anyone pushed, push something small (even a comment change) to see the pipeline run.",
              },
              {
                question: "A Phase 2/3 feature I read about isn't showing up.",
                answer: "Most of the deeper features (DORA, Analytics, Pulse Surveys, Investment Allocation, and the rest) sit behind per-workspace feature flags, off by default — these are turned on platform-side, not by a Workspace Admin, so contact us and we'll flip it on for your workspace.",
              },
              {
                question: "Can I remove a connected repo?",
                answer: "Yes — uninstalling repos from the GitHub App (via GitHub's own App settings) stops new analysis for them immediately; existing Evidence Ledger history stays intact unless you delete the workspace entirely.",
              },
              {
                question: "Who can invite people to my workspace?",
                answer: "Only a Workspace Admin can send invites, change roles, or remove people — from Settings → Team. Every one of those actions is written to the audit trail with who did it and when.",
              },
            ]}
          />
        </Reveal>
      </Section>
    </>
  );
}
