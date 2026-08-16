import type { Metadata } from "next";
import { PageHeader, Section, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Features — VeriSprint" };

const CATEGORIES: { title: string; items: { title: string; body: string }[] }[] = [
  {
    title: "Evidence & Confidence",
    items: [
      {
        title: "Evidence Ledger",
        body: "Every commit and PR is analyzed for tests added or conspicuously missing, TODOs/FIXMEs, dead code, and call-graph-relevant changes — a structured, per-file Evidence Item, not a summary.",
      },
      {
        title: "Confidence Score",
        body: "A 0–100 score per ticket, computed from its real Evidence Ledger — with the rationale and the exact evidence behind it always visible, never a black box.",
      },
      {
        title: "Historical Accuracy",
        body: "Per person, per month: how often claimed progress held up against verified evidence. Framed as calibration, not a performance review.",
      },
    ],
  },
  {
    title: "Reconciliation",
    items: [
      {
        title: "Claimed vs. Shipped",
        body: "A ticket marked Done with no matching evidence becomes a question on the dashboard — 'ENG-123 is Done — should the tests in auth.py be added?' — never an accusation.",
      },
      {
        title: "Ticket Drift Detector",
        body: "Catches acceptance criteria that changed after work started, comparing the current criteria against what the shipped evidence actually addresses.",
      },
      {
        title: "Orphan Commit Detector",
        body: "Surfaces commits that never got linked to a ticket, with a one-click way to retroactively link them and recompute confidence.",
      },
    ],
  },
  {
    title: "Communication, automated",
    items: [
      {
        title: "Auto-Drafted Standups",
        body: "One person, one day, built from real commits — a draft to review and post, not a blank text box waiting to be filled from memory.",
      },
      {
        title: "AI Repo Chat",
        body: "Ask your codebase natural-language questions, answered by the configured LLM with citations back to the real evidence it used.",
      },
      {
        title: "Slack Digests",
        body: "Daily digests delivered where your team already works, generated from the same evidence pipeline as the dashboard.",
      },
    ],
  },
  {
    title: "Reporting & proof of work",
    items: [
      {
        title: "Sprint Rollups & Investor Updates",
        body: "Drafted from real per-sprint evidence and confidence data — a generation failure leaves the report honestly marked 'failed,' never a fabricated summary.",
      },
      {
        title: "Client Proof-of-Work Portal",
        body: "A white-labeled, unguessable link your clients can check anytime — no login sharing, no raw code exposed, minted the moment you generate the report so the link never goes dead.",
      },
      {
        title: "Onboarding Doc Generator",
        body: "A new-hire guide to a repo, drafted from its real structure and recent activity.",
      },
      {
        title: "Confidence-Weighted Burndown",
        body: "A burndown built from real ConfidenceScore history — no synthesized future points, no self-reported percentages.",
      },
      {
        title: "Async Standup ROI Calculator",
        body: "Quantifies meeting time actually avoided. Dollar figures stay hidden until you explicitly set an hourly rate — never a guessed number.",
      },
    ],
  },
  {
    title: "Multi-repo & platform",
    items: [
      {
        title: "Multi-Repo Intelligence",
        body: "Stitches commits that share a ticket key across every repo in your workspace into one logical unit of work — a monorepo-adjacent ticket isn't reported on in fragments.",
      },
      {
        title: "Cross-File Impact Map",
        body: "Which real files a ticket's shipped evidence touches — an honest aggregation, not a guessed dependency graph.",
      },
      {
        title: "Compliance Audit Trail",
        body: "Every meaningful state change — role changes, billing changes, integration connect/disconnect, data export — is append-only logged and exportable to CSV.",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Product"
        title="Every feature traces back to a real commit."
        subtitle="Nothing here is a self-reported field. If VeriSprint shows you a number, it can show you the evidence behind it."
      />
      {CATEGORIES.map((cat, i) => (
        <Section key={cat.title} muted={i % 2 === 1}>
          <h2 className="text-2xl font-semibold text-slate-900">{cat.title}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((item) => (
              <Card key={item.title}>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.body}</p>
              </Card>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}
