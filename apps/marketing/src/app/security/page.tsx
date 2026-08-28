import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/config";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { HeroBackground } from "@/components/HeroBackground";
import { MagicCard } from "@/components/magicui/magic-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { Eye, Building2, ShieldCheck, ScrollText, ServerCog, KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "Security & Trust — VeriSprint" };

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Read-only, scoped access",
    body: "The GitHub App requests only Contents (read), Metadata (read), and Pull Requests (read) — never write access, never admin. VeriSprint cannot push code, merge a PR, or change a repo setting.",
  },
  {
    icon: Building2,
    title: "Multi-tenant isolation, enforced server-side",
    body: "Every workspace is a hard tenant boundary. Every API request carries a signed JWT with the caller's workspace embedded, and every query is scoped to it — checked in code on every request, not assumed from the UI.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access control",
    body: "Five strict roles — Super Admin (internal operations), Workspace Admin, Manager, Developer, and a read-only Client Portal role — each with least-privilege access. Role and permission changes are themselves audit-logged.",
  },
  {
    icon: ScrollText,
    title: "Append-only audit trail",
    body: "Role changes, billing changes, integration connect/disconnect, and data exports are logged with before/after state and exportable to CSV for your own compliance review.",
  },
  {
    icon: ServerCog,
    title: "Bring your own LLM",
    body: "By default, diff analysis runs through the Claude API. If your policy doesn't allow sending code to a third-party API at all, point VeriSprint at a self-hosted, OpenAI-compatible model server instead — the same analysis pipeline, on infrastructure you control.",
  },
  {
    icon: KeyRound,
    title: "Enterprise SSO",
    body: "OIDC-based single sign-on for Enterprise workspaces, as an alternative to GitHub OAuth or email/password.",
  },
];

export default function SecurityPage() {
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
          title="Built to be trusted with your commit history."
          subtitle="We're an early-access product and don't yet hold formal certifications like SOC 2 — here's exactly what the architecture does today, plainly stated."
        />
      </Section>
      <Section className="bg-[var(--background)]">
        <RevealGroup className="mx-auto max-w-5xl grid gap-6 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <RevealItem key={p.title}>
              <MagicCard className="flex h-full flex-col bg-[var(--surface)] shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-[var(--accent-neon)]/10 border border-[var(--line)] flex items-center justify-center mb-5 text-brand">
                  <p.icon className="h-6 w-6" strokeWidth={2} />
                </div>
                <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">{p.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{p.body}</p>
              </MagicCard>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>
      <Section variant="default" className="bg-[var(--background)] border-t border-[var(--line)]">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Have a security question?</h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">
            Reach our team directly at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand hover:text-brand transition-colors">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Reveal>
      </Section>
    </>
  );
}
