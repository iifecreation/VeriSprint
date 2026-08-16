import type { Metadata } from "next";
import { PageHeader, Section, Card, PrimaryButton } from "@/components/ui";
import { INSTALL_URL } from "@/lib/config";

export const metadata: Metadata = { title: "How it works — VeriSprint" };

const PIPELINE = [
  {
    title: "1. Install the GitHub App",
    body: "Read-only scopes only: Contents, Metadata, and Pull Requests. VeriSprint never requests write access to your repos.",
  },
  {
    title: "2. Push and pull-request events are ingested",
    body: "Webhooks enqueue a background job the moment code lands — VeriSprint acknowledges GitHub fast and does the real work asynchronously.",
  },
  {
    title: "3. The diff is analyzed by the configured LLM",
    body: "Anthropic's Claude by default, or your own self-hosted model (vLLM, Ollama, or any OpenAI-compatible server) if code can't leave your network — same analysis pipeline either way.",
  },
  {
    title: "4. Evidence Items are extracted",
    body: "Tests added or missing, TODOs, dead code, call-graph changes — each one structured, tied to a file, and stored against the ticket key found in the commit message.",
  },
  {
    title: "5. Confidence Scores are computed",
    body: "Every ticket's full Evidence Ledger is aggregated into a 0–100 score with a plain-English rationale.",
  },
  {
    title: "6. Claimed vs. shipped is reconciled",
    body: "A ticket marked Done with a low score, or acceptance criteria that quietly changed, becomes a flag — phrased as a question for the standup, never an accusation.",
  },
  {
    title: "7. Standups, reports, and digests draft themselves",
    body: "Built from the same evidence — a person reviews and posts, instead of writing from memory or skipping the meeting entirely.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Under the hood"
        title="From a git push to a defensible Confidence Score."
        subtitle="No step in this pipeline invents data. A failure at any stage surfaces honestly instead of producing a plausible-looking fallback."
      />
      <Section>
        <div className="mx-auto max-w-3xl space-y-6">
          {PIPELINE.map((step) => (
            <Card key={step.title} className="flex flex-col gap-1">
              <h3 className="font-semibold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600">{step.body}</p>
            </Card>
          ))}
        </div>
      </Section>
      <Section muted>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-slate-900">See it on your own repo</h2>
          <p className="mt-3 text-slate-600">Connect a repo and the first evidence starts appearing on the next push.</p>
          <div className="mt-6">
            <PrimaryButton href={INSTALL_URL}>Connect a GitHub repo</PrimaryButton>
          </div>
        </div>
      </Section>
    </>
  );
}
