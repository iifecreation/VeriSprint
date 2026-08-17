import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/config";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";

export const metadata: Metadata = { title: "Security & Trust — VeriSprint" };

const PRINCIPLES = [
  {
    title: "Read-only, scoped access",
    body: "The GitHub App requests only Contents (read), Metadata (read), and Pull Requests (read) — never write access, never admin. VeriSprint cannot push code, merge a PR, or change a repo setting.",
  },
  {
    title: "Multi-tenant isolation, enforced server-side",
    body: "Every workspace is a hard tenant boundary. Every API request carries a signed JWT with the caller's workspace embedded, and every query is scoped to it — checked in code on every request, not assumed from the UI.",
  },
  {
    title: "Role-based access control",
    body: "Five strict roles — Super Admin (internal operations), Workspace Admin, Manager, Developer, and a read-only Client Portal role — each with least-privilege access. Role and permission changes are themselves audit-logged.",
  },
  {
    title: "Append-only audit trail",
    body: "Role changes, billing changes, integration connect/disconnect, and data exports are logged with before/after state and exportable to CSV for your own compliance review.",
  },
  {
    title: "Bring your own LLM",
    body: "By default, diff analysis runs through the Claude API. If your policy doesn't allow sending code to a third-party API at all, point VeriSprint at a self-hosted, OpenAI-compatible model server instead — the same analysis pipeline, on infrastructure you control.",
  },
  {
    title: "Enterprise SSO",
    body: "OIDC-based single sign-on for Enterprise workspaces, as an alternative to GitHub OAuth or email/password.",
  },
];

export default function SecurityPage() {
  return (
    <>
      <Section variant="default" className="bg-slate-50 pb-16 pt-20 border-b border-slate-200 relative overflow-hidden">
        <DotPattern className="opacity-60" />
        <PageHeader
          eyebrow="Security & Trust"
          title="Built to be trusted with your commit history."
          subtitle="We're an early-access product and don't yet hold formal certifications like SOC 2 — here's exactly what the architecture does today, plainly stated."
        />
      </Section>
      <Section className="bg-slate-50">
        <div className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <MagicCard key={p.title} className="flex-col h-full bg-white shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-blue-50 border border-slate-200 flex items-center justify-center mb-5">
                 <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                 </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{p.body}</p>
            </MagicCard>
          ))}
        </div>
      </Section>
      <Section variant="default" className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Have a security question?</h2>
          <p className="mt-4 text-slate-600 text-lg">
            Reach our team directly at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand hover:text-blue-600 transition-colors">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
