import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";
import { RevealGroup, RevealItem } from "@/components/Reveal";
import { HeroBackground } from "@/components/HeroBackground";
import { Rocket, TrendingUp, Sparkles } from "lucide-react";

export const metadata: Metadata = { title: "Changelog — VeriSprint" };

const RELEASES = [
  {
    version: "v3.0 — Growth & Enterprise Expansion",
    icon: Rocket,
    accentBg: "bg-violet-50",
    accentText: "text-violet-700",
    items: [
      "Client Proof-of-Work Portal (white-labeled) and Investor Update Generator",
      "Confidence-Weighted Burndown and ML-based Delivery Forecasts",
      "Onboarding Doc Generator and Async Standup Replacements",
      "Multi-repo/monorepo intelligence and Value Stream Mapping",
      "Cost Capitalization Reports (audit-ready R&D spend)",
      "Enterprise SSO (OIDC) + SCIM, Compliance & Audit Trail mode, and Private/On-Prem LLM options",
      "PR AutoRoute (policy-based reviewer assignment) and Pulse Surveys",
    ],
  },
  {
    version: "v2.0 — Early Paid Tier",
    icon: TrendingUp,
    accentBg: "bg-teal-50",
    accentText: "text-teal-700",
    items: [
      "AI Repo Chat: Ask your codebase questions, answered with real citations",
      "Sprint rollups, visual changelogs, and Slack/email digests",
      "Ticket Drift Detector, Orphan Commit Detector, and Risk Radar",
      "DORA Metrics Panel and Team Goals benchmarked against history",
      "Blocker Nudge Bot and cross-file impact maps",
      "Code Health Signals and AI Contribution Tracker",
      "Investment Allocation and Team Allocation Dashboards",
      "Open Integration Framework (Linear, Jira, PagerDuty, Datadog, Opsgenie)",
    ],
  },
  {
    version: "v1.0 — MVP Launch",
    icon: Sparkles,
    accentBg: "bg-amber-500/15",
    accentText: "text-amber-700",
    items: [
      "GitHub connection (OAuth + App install, read-only scopes)",
      "Deep commit/PR analysis with plain-English summaries",
      "Evidence Ledger (cited evidence behind every judgment)",
      "Completion-confidence score per ticket",
      "Auto-drafted standup update and Claimed vs Shipped view",
      "Mismatch alerts (framed as questions) and PM/Developer dashboards",
    ],
  },
];

export default function ChangelogPage() {
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
        <PageHeader title="What's shipped." subtitle="We release updates constantly. Here is the major historical log." />
      </Section>
      <Section>
        <RevealGroup className="mx-auto max-w-3xl space-y-12">
          {RELEASES.map((release) => (
            <RevealItem key={release.version}>
              <MagicCard className="relative overflow-hidden shadow-sm bg-[var(--surface)] border-[var(--line)] h-auto flex flex-col">
                <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4 mb-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${release.accentBg} ${release.accentText}`}>
                    <release.icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">{release.version}</h2>
                </div>
                <ul className="space-y-3">
                  {release.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm text-[var(--text-muted)]">
                      <span className={`mt-0.5 ${release.accentText}`}>●</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </MagicCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>
    </>
  );
}
