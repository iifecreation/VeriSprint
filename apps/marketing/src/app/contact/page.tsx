import type { Metadata } from "next";
import { PageHeader, Section, Card, PrimaryButton } from "@/components/ui";
import { CONTACT_EMAIL, INSTALL_URL } from "@/lib/config";

export const metadata: Metadata = { title: "Contact — VeriSprint" };

const REASONS = [
  { title: "Enterprise & Agency plans", body: "SSO, on-prem LLM, white-labeled Client Portal, or a dedicated setup call." },
  { title: "Security questions", body: "Anything about how VeriSprint handles your code, scopes, or workspace isolation." },
  { title: "Something looks wrong", body: "A page claiming a capability that doesn't actually work as described — please tell us." },
  { title: "Anything else", body: "General questions, feedback, or partnership inquiries." },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to us"
        subtitle="We're a small team — email goes directly to the people building this, not a ticket queue."
      />
      <Section>
        <div className="mx-auto max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {REASONS.map((r) => (
              <Card key={r.title}>
                <h3 className="font-semibold text-slate-900">{r.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{r.body}</p>
              </Card>
            ))}
          </div>
          <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-500">Email us directly:</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block text-xl font-semibold text-indigo-600 hover:text-indigo-700">
              {CONTACT_EMAIL}
            </a>
            <p className="mt-6 text-sm text-slate-500">Or skip the email and just try it:</p>
            <div className="mt-3">
              <PrimaryButton href={INSTALL_URL}>Connect a GitHub repo</PrimaryButton>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
