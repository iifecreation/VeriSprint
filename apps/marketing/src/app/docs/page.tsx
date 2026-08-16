import type { Metadata } from "next";
import { PageHeader, Section, Card } from "@/components/ui";

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
    title: "Self-hosting the LLM analysis",
    body: "Set LLM_PROVIDER=openai_compatible and point ON_PREM_LLM_BASE_URL at any OpenAI-compatible server (vLLM, Ollama, LM Studio, text-generation-webui) to keep code analysis entirely on infrastructure you control.",
  },
];

export default function DocsPage() {
  return (
    <>
      <PageHeader eyebrow="Docs" title="Get started in a few minutes." />
      <Section>
        <div className="mx-auto max-w-3xl space-y-6">
          {SECTIONS.map((s) => (
            <Card key={s.title}>
              <h3 className="font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
