import type { Metadata } from "next";
import { PageHeader, Section, Card } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/config";

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
    body: "Five roles — Workspace Owner/Admin, Manager, Developer, and a read-only Client Portal role — each with least-privilege access. Role and permission changes are themselves audit-logged.",
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
      <PageHeader
        eyebrow="Security & Trust"
        title="Built to be trusted with your commit history."
        subtitle="We're an early-access product and don't yet hold formal certifications like SOC 2 — here's exactly what the architecture does today, plainly stated."
      />
      <Section>
        <div className="grid gap-6 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <Card key={p.title}>
              <h3 className="font-semibold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{p.body}</p>
            </Card>
          ))}
        </div>
      </Section>
      <Section muted>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold text-slate-900">Have a security question?</h2>
          <p className="mt-2 text-slate-600">
            Reach our team directly at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-indigo-600 hover:text-indigo-700">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
