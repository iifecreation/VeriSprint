import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";

export const metadata: Metadata = { title: "Changelog — VeriSprint" };

const RELEASES = [
  {
    version: "v3.0 — Growth & Enterprise Expansion",
    items: [
      "Client Proof-of-Work Portal (white-labeled) and Investor Update Generator",
      "Confidence-Weighted Burndown and ML-based Delivery Forecasts",
      "Onboarding Doc Generator and Async Standup Replacements",
      "Multi-repo/monorepo intelligence and Value Stream Mapping",
      "Cost Capitalization Reports (audit-ready R&D spend)",
      "Enterprise SSO/SAML, Compliance & Audit Trail mode, and Private/On-Prem LLM options",
      "PR AutoRoute (policy-based reviewer assignment) and Pulse Surveys",
    ],
  },
  {
    version: "v2.0 — Early Paid Tier",
    items: [
      "AI Repo Chat: Ask your codebase questions, answered with real citations",
      "Sprint rollups, visual changelogs, and Slack/email digests",
      "Ticket Drift Detector, Orphan Commit Detector, and Risk Radar",
      "DORA Metrics Panel and Team Goals benchmarked against history",
      "Blocker Nudge Bot and Cross-file impact maps",
      "Durable Change Score and AI Contribution Tracker",
      "Investment Allocation and Team Allocation Dashboards",
      "Open Integration Framework (GitHub, Jira, Linear, Slack)",
    ],
  },
  {
    version: "v1.0 — MVP Launch",
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
      <Section variant="default" className="bg-slate-50 pb-16 pt-20 border-b border-slate-200 relative overflow-hidden">
        <DotPattern className="opacity-60" />
        <PageHeader eyebrow="Changelog" title="What's shipped." subtitle="We release updates constantly. Here is the major historical log." />
      </Section>
      <Section>
        <div className="mx-auto max-w-3xl space-y-12">
          {RELEASES.map((release) => (
            <MagicCard key={release.version} className="relative overflow-hidden shadow-sm bg-white border-slate-200 h-auto flex flex-col">
              <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-4 mb-4">{release.version}</h2>
              <ul className="space-y-3">
                {release.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-slate-600">
                    <span className="text-[var(--accent-neon-hover)] mt-0.5">●</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </MagicCard>
          ))}
        </div>
      </Section>
    </>
  );
}
