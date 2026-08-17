import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";

export const metadata: Metadata = { title: "Docs — VeriSprint" };

const SECTIONS = [
  {
    title: "Getting started",
    body: "Connect a repo from the homepage, or a workspace admin can install the GitHub App directly from Settings. The first Evidence Items appear on the next push after install — nothing is backfilled retroactively yet.",
  },
  {
    title: "Inviting your team",
    body: "Workspace Admins can invite teammates by email from Settings → Team. An invite email carries a one-time link; accepting it sets a password and signs the person in. GitHub OAuth remains available as the primary sign-in path for anyone in your GitHub org.",
  },
  {
    title: "Reading a Confidence Score",
    body: "Open any ticket to see its score, a plain-English rationale, and the exact Evidence Items behind it. A low score isn't a verdict — it's a prompt to check whether the acceptance criteria were actually met.",
  },
  {
    title: "Responding to a reconciliation flag",
    body: "Flags are questions, not accusations. Resolve one once the underlying work is confirmed, linked, or corrected — resolving doesn't edit history, it just marks the question as answered.",
  },
  {
    title: "Sharing a Client Portal link",
    body: "Generate a Client Proof-of-Work Portal report from the Reports page. The link is minted immediately and stays stable even while the report is still generating, so it's never a dead link.",
  },
  {
    title: "Open Integration Framework",
    body: "VeriSprint integrates directly with Jira, Linear, Slack, and GitLab/Bitbucket. Add your API tokens in the Integrations tab, and we'll automatically sync ticket criteria and deliver mismatch alerts to the right Slack channels.",
  },
  {
    title: "Configuring your team",
    body: "Set up Working Agreements (e.g., PR size limits, review SLAs) and schedule Pulse Surveys from the Team Settings page. The system will track adherence and correlate developer experience with delivery metrics automatically.",
  },
  {
    title: "Self-hosting the LLM analysis",
    body: "Set LLM_PROVIDER=openai_compatible and point ON_PREM_LLM_BASE_URL at any OpenAI-compatible server (vLLM, Ollama, LM Studio, text-generation-webui) to keep code analysis entirely on infrastructure you control.",
  },
];

export default function DocsPage() {
  return (
    <>
      <Section variant="default" className="bg-slate-50 pb-16 pt-20 border-b border-slate-200 relative overflow-hidden">
        <DotPattern className="opacity-60" />
         <PageHeader eyebrow="Docs" title="Get started in a few minutes." subtitle="Everything you need to know to configure and use VeriSprint effectively." />
      </Section>
      <Section>
        <div className="mx-auto max-w-4xl grid gap-6 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <MagicCard key={s.title} className="flex-col h-full bg-white shadow-sm hover:shadow-md transition-shadow border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 mb-3">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
            </MagicCard>
          ))}
        </div>
      </Section>
    </>
  );
}
