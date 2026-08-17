import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";

export const metadata: Metadata = { title: "Features — VeriSprint" };

const CATEGORIES: { title: string; items: { title: string; body: string }[] }[] = [
  {
    title: "Evidence & Confidence",
    items: [
      { title: "Evidence Ledger", body: "Every commit and PR is analyzed for tests added, TODOs, dead code, and call-graph context — an inspectable evidence item, not a summary." },
      { title: "Confidence Score", body: "A 0–100 score per ticket, computed from its real Evidence Ledger." },
      { title: "Durable Change Score", body: "Distinguishes durable code progress from churn and rework, filtering out the noise." },
      { title: "Historical Accuracy", body: "Per person, per month: how often claimed progress held up against verified evidence." },
    ],
  },
  {
    title: "Reconciliation & Risk",
    items: [
      { title: "Claimed vs. Shipped", body: "Flags mismatches between ticket status and real commits as questions, never accusations." },
      { title: "Ticket Drift Detector", body: "Catches acceptance criteria that changed after work started without re-estimation." },
      { title: "Risk Radar", body: "Proactive alert feed predicting when deadlines might slip based on commit velocity and blockers." },
      { title: "Orphan Commit Detector", body: "Surfaces real work that never got linked to a ticket, with a one-click retroactive link." },
    ],
  },
  {
    title: "Engineering Intelligence",
    items: [
      { title: "DORA Metrics Panel", body: "Deployment frequency, lead time, CFR, and MTTR benchmarked against team history." },
      { title: "Investment Allocation", body: "Commits and tickets tagged and rolled up by business initiative to show where time is spent." },
      { title: "Cost Capitalization Report", body: "Audit-ready R&D spend reports broken down by strategic initiative." },
      { title: "Delivery Forecast", body: "ML model trained on the workspace's own Evidence Ledger history to predict completion dates." },
      { title: "Pulse Surveys", body: "Short developer experience check-ins correlated with actual delivery metrics." },
    ],
  },
  {
    title: "Communication & Automation",
    items: [
      { title: "Auto-Drafted Standups", body: "A daily summary drafted from real commits for developers to review, saving them time." },
      { title: "AI Repo Chat", body: "Ask your codebase questions, answered with citations back to the real evidence." },
      { title: "Blocker Nudge Bot", body: "Slack alerts for stalled PRs or stuck reviews, keeping work flowing." },
      { title: "PR AutoRoute", body: "Policy-based reviewer assignment and auto-merging of low-risk changes." },
    ],
  },
  {
    title: "Reporting & Proof of Work",
    items: [
      { title: "Client Proof-of-Work Portal", body: "A white-labeled, unguessable link for agencies to prove delivered work to clients — no codebase access required." },
      { title: "Investor Update Generator", body: "Auto-drafts the 'what we built' section of a monthly investor update from verified history." },
      { title: "Visual Changelog", body: "Auto-generated visual change snapshots per sprint for stakeholders." },
      { title: "Onboarding Doc Generator", body: "Turns the codebase's real structure and recent history into living onboarding docs." },
      { title: "Confidence-Weighted Burndown", body: "A sprint burndown built from real evidence, not self-reported percentages." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Section variant="default" className="bg-slate-50 pb-16 pt-20 border-b border-slate-200 relative overflow-hidden">
        <DotPattern className="opacity-60" />
        <PageHeader
          eyebrow="Product"
          title="Every feature traces back to a real commit."
          subtitle="Nothing here is a self-reported field. If VeriSprint shows you a number, it can show you the evidence behind it."
        />
      </Section>
      <div className="bg-slate-50">
      {CATEGORIES.map((cat, i) => (
        <Section key={cat.title} variant={i % 2 === 1 ? "sky" : "default"} className={i % 2 === 1 ? "border-y border-slate-200" : ""}>
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{cat.title}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cat.items.map((item) => (
                <MagicCard key={item.title} className="flex flex-col h-full">
                  <div className="h-10 w-10 rounded-xl bg-[var(--accent-neon)]/10 flex items-center justify-center mb-4">
                     <span className="text-[var(--accent-neon-hover)] font-bold">⌘</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </MagicCard>
              ))}
            </div>
          </div>
        </Section>
      ))}
      </div>
    </>
  );
}
