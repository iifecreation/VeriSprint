import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section, FAQSection } from "@/components/ui";
import { INSTALL_URL } from "@/lib/config";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { HeroBackground } from "@/components/HeroBackground";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { cardAccent } from "@/lib/palette";
import { PRODUCTS } from "@/lib/products";

export const metadata: Metadata = {
  title: "Features — VeriSprint",
  description: "Six product areas, thirty-nine features, every one traced back to a real commit — Evidence Ledger, Team Intelligence, Risk & Automation, Reporting, Team Health, and Enterprise.",
};

const SPOTLIGHT = [
  {
    title: "The Evidence Ledger",
    tag: "The foundation everything else is built on",
    body: "Every commit and pull request is analyzed for tests added or missing, TODOs, dead code, call-graph context, and AI-vs-human authorship — each finding stored as a structured, timestamped Evidence Item tied to a file and a ticket key. Nothing here is a rolled-up summary you have to trust; every item is inspectable on its own.",
    mock: { label: "Evidence Item", lines: ["kind: test_added", "file: api_handler.go:88-104", "ticket: ENG-409", "confidence_contribution: +14"] },
  },
  {
    title: "Confidence Score",
    tag: "A number you can actually interrogate",
    body: "Every ticket gets a 0–100 score computed from its own Evidence Ledger, with a plain-English rationale sitting right next to it — 'Tests added for the new endpoint, but the error-handling branch has no coverage yet.' Click the score, see the evidence. There's no version of this feature where the number exists without the explanation.",
    mock: { label: "Confidence Score", lines: ["ticket: ENG-409", "score: 78 / 100", "rationale: tests added,", "  1 branch uncovered"] },
  },
  {
    title: "Claimed vs. Shipped",
    tag: "Mismatches, framed as questions",
    body: "When a ticket is marked Done but its Evidence Ledger doesn't back that up, VeriSprint doesn't silently downgrade the score or send an accusation — it raises a specific, answerable question in the standup: 'ENG-123 is Done — I don't see the tests landing, did those go in under a different commit?' Two-way transparency by default: developers see the exact same flag a PM sees.",
    mock: { label: "Reconciliation Flag", lines: ["type: claimed_not_shipped", "ticket: ENG-123", "question: tests missing —", "  different commit?"] },
  },
  {
    title: "AI Repo Chat",
    tag: "Ask your codebase a question",
    body: "Type a plain question — in Slack or the dashboard — like 'did we finish the checkout redesign this week?' and get an answer grounded in real commits and PRs, with citations back to the exact diffs. This turns VeriSprint from a dashboard you have to remember to check into an assistant you ask.",
    mock: { label: "Repo Chat", lines: ['Q: "did we ship checkout', '     redesign this week?"', "A: Yes — 6 commits, PR #412", "   merged Thu. [2 citations]"] },
  },
  {
    title: "Client Proof-of-Work Portal",
    tag: "For agencies and freelancers",
    body: "A branded, read-only, revocable link clients can check any time to see verified proof of what was delivered against what was billed — no codebase access, no shared login. This is the one feature in the category built for an audience outside engineering entirely: the people paying the invoice.",
    mock: { label: "Client Portal", lines: ["client: Acme Co", "period: Aug 1 – Aug 14", "delivered: 3 features,", "  2 bug fixes, verified"] },
  },
] as const;

export default function FeaturesPage() {
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
        <PageHeader
          title="Six products. One evidence source."
          subtitle="Nothing here is a self-reported field. If VeriSprint shows you a number, it can show you the evidence behind it — five signature features below in depth, then all six product areas."
        />
      </Section>

      {/* Spotlight: the five features that make VeriSprint's own case, each
          given the heading + paragraph + proof treatment instead of a
          one-line card. */}
      <Section variant="default">
        <div className="mx-auto max-w-5xl space-y-16">
          {SPOTLIGHT.map((f, i) => (
            <Reveal key={f.title} delay={0.05 * i}>
              <div className={`flex flex-col gap-10 lg:flex-row lg:items-center ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider font-mono text-brand mb-3">{f.tag}</p>
                  <h3 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">{f.title}</h3>
                  <p className="mt-4 text-base leading-relaxed text-[var(--text-muted)]">{f.body}</p>
                </div>
                <div className="flex-1 w-full">
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-md overflow-hidden font-mono">
                    <div className="bg-[var(--background)] border-b border-[var(--line)] px-4 py-2 flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                      </div>
                      <span className="text-xs text-[var(--text-dim)] ml-2">{f.mock.label}</span>
                    </div>
                    <div className="p-5 space-y-1.5 text-sm text-[var(--text-muted)]">
                      {f.mock.lines.map((line, li) => (
                        <div key={li}>{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Six products */}
      <div>
        <Section variant="default" className="pb-0 bg-[var(--background)] border-y border-[var(--line)]">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">The full lineup</p>
            <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">Six products, framed around who needs them</h2>
            <p className="mt-4 text-[var(--text-muted)] text-lg leading-relaxed">
              Every feature below lives in exactly one of these — not because they&apos;re technically related, but
              because they answer the same buyer&apos;s question.
            </p>
          </Reveal>
        </Section>

        {PRODUCTS.map((product, i) => (
          <Section key={product.name} variant={i % 2 === 1 ? "sky" : "default"} className={i % 2 === 1 ? "border-y border-[var(--line)]" : ""}>
            <div className="mx-auto max-w-6xl">
              <Reveal className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end mb-10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider font-mono text-brand mb-3">{product.eyebrow}</p>
                  <h3 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">{product.name}</h3>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">{product.pitch}</p>
                  <div className="mt-4">
                    <Link
                      href={`/platform/${product.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-brand hover:underline"
                    >
                      Explore {product.name} in depth →
                    </Link>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm lg:justify-self-end lg:w-full lg:max-w-xs">
                  <p className="text-4xl font-bold text-[var(--foreground)]">{product.stat.value}</p>
                  <p className="mt-2 text-sm text-[var(--text-dim)] leading-snug">{product.stat.label}</p>
                </div>
              </Reveal>

              <RevealGroup className={`grid gap-5 ${product.features.length > 4 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
                {product.features.map((item) => {
                  const accent = cardAccent(i);
                  return (
                    <RevealItem key={item.title}>
                      <div className="flex h-full gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
                          <item.icon className="h-4.5 w-4.5" strokeWidth={2} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--foreground)]">{item.title}</h4>
                          <p className="mt-1.5 text-sm text-[var(--text-muted)] leading-relaxed">{item.body}</p>
                        </div>
                      </div>
                    </RevealItem>
                  );
                })}
              </RevealGroup>
            </div>
          </Section>
        ))}
      </div>

      {/* FAQ */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Common questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">About the feature set</h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Do I need to enable every product above?",
                answer: "No. Team Intelligence, Risk & Automation (beyond the drift/orphan detectors), Team Health, and Enterprise features sit behind per-workspace feature flags, off by default — a Workspace Admin turns each one on individually as it's needed.",
              },
              {
                question: "Which of these work without a paid plan?",
                answer: "The Free tier includes the full Verification Engine (Evidence Ledger, Confidence Score, Claimed vs. Shipped), auto-drafted standups, and the Client Proof-of-Work Portal for one repo, indefinitely. See Pricing for what each paid tier unlocks.",
              },
              {
                question: "Is the Delivery Forecast a trained ML model?",
                answer: "No — it's a real statistical projection: a linear extrapolation of a sprint's own confidence-weighted velocity so far. VeriSprint doesn't yet have the volume of historical sprint data a trained model would need to avoid overfitting on a handful of examples, so this stays a transparent trend line rather than an opaque prediction, and says so.",
              },
              {
                question: "New here — where do I actually start?",
                answer: "The Help Center walks through connecting a repo and using VeriSprint day-to-day, with a separate guide for each role (PM, developer, agency owner, founder).",
              },
            ]}
          />
        </Reveal>
      </Section>

      <Section variant="default" className="bg-[var(--background)] border-t border-[var(--line)]">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">See it against your own commits</h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">Connect a repo — the Free tier has no time limit and no credit card.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href={INSTALL_URL} className="inline-block">
              <ShimmerButton background="#4fb8c4" className="text-lg px-8 py-2">Connect a GitHub repo</ShimmerButton>
            </Link>
            <Link href="/docs" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              Not sure where to start? See the Help Center →
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
