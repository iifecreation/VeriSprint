import Link from "next/link";
import { Section, Eyebrow, Card, CheckIcon, PrimaryButton, SecondaryButton } from "@/components/ui";
import { INSTALL_URL } from "@/lib/config";

const STEPS = [
  {
    title: "Connect a repo",
    body: "Install the read-only GitHub App. VeriSprint never sees your code in a PR review sense — it reads commits, diffs, and PR metadata to build evidence, nothing else.",
  },
  {
    title: "Every commit becomes evidence",
    body: "Each diff is analyzed for tests added or conspicuously missing, TODOs, dead code, and call-graph changes — logged as an Evidence Item, not a guess.",
  },
  {
    title: "Tickets get a real Confidence Score",
    body: "Claimed-done tickets are checked against their actual Evidence Ledger. Score, rationale, and the exact evidence behind it are all visible — never a black box.",
  },
  {
    title: "Standups and reports draft themselves",
    body: "Daily standups, sprint rollups, and investor updates are drafted from what shipped — a person reviews and sends, instead of writing it from memory.",
  },
];

const FEATURES = [
  { title: "Confidence Score", body: "A transparent 0–100 score per ticket, with the evidence it's built from always one click away." },
  { title: "Claimed vs. Shipped Reconciliation", body: "Flags mismatches as questions, never accusations — 'ENG-123 is Done — should the tests in auth.py be added?'" },
  { title: "AI Repo Chat", body: "Ask your codebase natural-language questions, answered with citations back to real commits and files." },
  { title: "Confidence-Weighted Burndown", body: "A burndown built from real ConfidenceScore history — no self-reported percentages, no synthesized future points." },
  { title: "Client Proof-of-Work Portal", body: "A white-labeled, unguessable link your clients can check anytime — no login sharing, no raw code exposed." },
  { title: "Ticket Drift & Orphan Commit Detection", body: "Catches acceptance criteria that quietly changed mid-sprint, and commits that never got linked to a ticket." },
];

export default function HomePage() {
  return (
    <>
      <Section className="pt-20 pb-8 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Engineering visibility, not status-update theater</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
            What actually shipped — backed by commits.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            VeriSprint reads real GitHub activity, turns it into an Evidence Ledger and a per-ticket Confidence Score,
            and flags claimed-vs-shipped mismatches as questions — never accusations.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton href={INSTALL_URL}>Connect a GitHub repo</PrimaryButton>
            <SecondaryButton href="/how-it-works">See how it works</SecondaryButton>
          </div>
          <p className="mt-4 text-xs text-slate-400">Free to start. No credit card required for the Free tier.</p>
        </div>
      </Section>

      <Section muted>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Status meetings ask people to remember what they did. VeriSprint already knows.
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <Card key={step.title}>
              <span className="text-sm font-semibold text-indigo-600">Step {i + 1}</span>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>What you get</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Everything traces back to a real commit.</h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3">
              <CheckIcon />
              <div>
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/features" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            See every feature →
          </Link>
        </div>
      </Section>

      <Section muted>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-slate-900">A score is only as good as its evidence.</h2>
          <p className="mt-4 text-slate-600">
            Every Confidence Score, every reconciliation flag, and every drafted report is generated from your team&apos;s
            actual commits and pull requests. If the underlying analysis fails, VeriSprint says so — it never fills the
            gap with a plausible-sounding guess.
          </p>
        </div>
      </Section>

      <Section>
        <div className="mx-auto max-w-2xl rounded-2xl bg-slate-900 px-8 py-12 text-center">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">Ready to see what your team actually shipped?</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <PrimaryButton href={INSTALL_URL}>Connect a GitHub repo</PrimaryButton>
            <Link href="/pricing" className="text-sm font-medium text-slate-300 hover:text-white">
              View pricing →
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
