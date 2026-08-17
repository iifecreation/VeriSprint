import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { INSTALL_URL } from "@/lib/config";
import Link from "next/link";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

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
    title: "3. Analyzed by the LLM Orchestration Layer",
    body: "To control costs and latency, our orchestration layer uses a selective deep-dive approach: it quickly categorizes a commit's scope, and only pulls in the full repository context for expensive analysis if the commit is tied to an active ticket.",
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
      <Section variant="default" className="bg-slate-50 pb-16 pt-20 border-b border-slate-200 relative overflow-hidden">
        <DotPattern className="opacity-60" />
        <PageHeader
          eyebrow="Under the hood"
          title="From a git push to a defensible Confidence Score."
          subtitle="No step in this pipeline invents data. A failure at any stage surfaces honestly instead of producing a plausible-looking fallback."
        />
      </Section>
      <Section>
        <div className="mx-auto max-w-3xl relative">
          {/* Vertical line connecting steps */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-blue-100 hidden md:block"></div>
          <div className="space-y-8 relative">
          {PIPELINE.map((step, i) => (
            <div key={step.title} className="flex gap-6 md:gap-10">
              <div className="hidden md:flex flex-shrink-0 w-12 h-12 rounded-full bg-white border border-brand/20 items-center justify-center shadow-sm relative z-10 text-brand font-bold">
                 {i + 1}
              </div>
              <MagicCard className="flex-1 flex-col h-full bg-white shadow-sm border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.body}</p>
              </MagicCard>
            </div>
          ))}
          </div>
        </div>
      </Section>
      <Section variant="default" className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">See it on your own repo</h2>
          <p className="mt-4 text-slate-600 text-lg">Connect a repo and the first evidence starts appearing on the next push.</p>
          <div className="mt-8 flex justify-center">
            <Link href={INSTALL_URL} className="inline-block">
              <ShimmerButton background="#001666" className="text-lg px-8 py-2">Connect a GitHub repo</ShimmerButton>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
