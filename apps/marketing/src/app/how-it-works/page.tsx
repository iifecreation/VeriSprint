import type { Metadata } from "next";
import { PageHeader, Section, FAQSection } from "@/components/ui";
import { INSTALL_URL } from "@/lib/config";
import Link from "next/link";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Reveal } from "@/components/Reveal";
import { PipelineTimeline } from "@/components/PipelineTimeline";

export const metadata: Metadata = {
  title: "How it works — VeriSprint",
  description: "The full pipeline from a git push to a defensible Confidence Score — GitHub App scopes, ingestion, LLM analysis, the Evidence Ledger, and reconciliation, step by step.",
};

const PIPELINE = [
  {
    title: "1. Install the GitHub App",
    body: "Read-only scopes only: Contents, Metadata, and Pull Requests. VeriSprint never requests write access to your repos — there's no scope in the app manifest that could push code, merge a PR, or change a setting even if something went wrong.",
  },
  {
    title: "2. Push and pull-request events are ingested",
    body: "Webhooks enqueue a background job the moment code lands — VeriSprint acknowledges GitHub fast (under GitHub's own webhook timeout) and does the real work asynchronously, so a slow analysis never blocks or delays your push.",
  },
  {
    title: "3. Analyzed by the LLM orchestration layer",
    body: "To control cost and latency, a cheap classification pass runs first to categorize a commit's scope. Only commits tied to an active ticket get the expensive, full-repository-context deep-dive — a selective pipeline instead of running maximum analysis on every single commit regardless of relevance.",
  },
  {
    title: "4. Evidence Items are extracted",
    body: "Tests added or missing, TODOs, dead code, call-graph changes, self-disclosed AI authorship — each one structured, tied to a specific file, and stored against the ticket key found in the commit message or PR description.",
  },
  {
    title: "5. Confidence Scores are computed",
    body: "Every ticket's full Evidence Ledger is aggregated into a 0–100 score with a plain-English rationale — the score and the reasoning behind it are always shown together, never the number alone.",
  },
  {
    title: "6. Claimed vs. shipped is reconciled",
    body: "A ticket marked Done with a low score, or acceptance criteria that quietly changed after work started, becomes a flag — phrased as a specific question for the standup, never a silent penalty or an accusation.",
  },
  {
    title: "7. Standups, reports, and digests draft themselves",
    body: "Built from the same evidence a person actually reviews and posts — the auto-draft replaces the work of remembering and typing, not the human's judgment about whether it reads right.",
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
          subtitle="No step in this pipeline invents data. A failure at any stage surfaces honestly — as a missing score or a visible error — instead of producing a plausible-looking fallback."
        />
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl">
          <PipelineTimeline steps={PIPELINE.map((s) => ({ title: s.title, body: s.body }))} />
        </div>
      </Section>

      {/* Proof of mechanism — a real example, not decoration. Shows the
          actual shape of an Evidence Item and how it rolls up into a score,
          the single highest-leverage visual for an evidence-first pitch. */}
      <Section variant="default" className="bg-slate-50 border-y border-slate-200">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">A real example</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">One ticket, from commit to score</h2>
          <p className="mt-4 text-slate-600 text-lg">Not a mockup of made-up numbers — this is the actual shape of the data at each stage.</p>
        </Reveal>
        <Reveal className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden font-mono text-sm">
            <div className="bg-slate-900 text-slate-200 px-5 py-3">git push → webhook → ingestion queue</div>
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Evidence Item #1</p>
              <p className="text-slate-700">kind: test_added · file: api_handler.go:88–104 · ticket: ENG-409</p>
            </div>
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Evidence Item #2</p>
              <p className="text-slate-700">kind: todo_unresolved · file: api_handler.go:142 · ticket: ENG-409</p>
            </div>
            <div className="px-5 py-4 bg-[var(--accent-neon)]/5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-2">Confidence Score → ENG-409</p>
              <p className="text-slate-900 font-semibold">78 / 100 — &ldquo;Tests added for the new endpoint, but a TODO on the error-handling branch is still open.&rdquo;</p>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* FAQ */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Questions about the pipeline</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">How it actually runs</h2>
        </Reveal>
        <FAQSection
          items={[
            {
              question: "How long after I push does a score update?",
              answer: "Ingestion is triggered by the webhook the moment GitHub delivers it — typically seconds. The full LLM analysis pass for a ticket-linked commit usually completes within a couple of minutes, depending on diff size and current queue depth.",
            },
            {
              question: "What happens if the LLM call fails?",
              answer: "The job is retried through the queue's normal retry policy; if it keeps failing, the failure is logged as a visible error rather than silently skipped, and never falls back to a guessed or placeholder score.",
            },
            {
              question: "Can I run this against a self-hosted LLM instead of the Claude API?",
              answer: "Yes — set LLM_PROVIDER to point at any OpenAI-compatible server (vLLM, Ollama, LM Studio, and similar) and every step in this pipeline runs unchanged against your own infrastructure instead. See Security for why that option exists.",
            },
          ]}
        />
      </Section>

      <Section variant="default" className="bg-slate-50 border-t border-slate-200">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">See it on your own repo</h2>
          <p className="mt-4 text-slate-600 text-lg">Connect a repo and the first evidence starts appearing on the next push.</p>
          <div className="mt-8 flex justify-center">
            <Link href={INSTALL_URL} className="inline-block">
              <ShimmerButton background="#001666" className="text-lg px-8 py-2">Connect a GitHub repo</ShimmerButton>
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
