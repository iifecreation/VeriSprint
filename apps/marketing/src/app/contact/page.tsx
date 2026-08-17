import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { CONTACT_EMAIL, INSTALL_URL } from "@/lib/config";
import Link from "next/link";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShimmerButton } from "@/components/magicui/shimmer-button";

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
      <Section variant="default" className="bg-slate-50 pb-16 pt-20 border-b border-slate-200 relative overflow-hidden">
        <DotPattern className="opacity-60" />
        <PageHeader
          eyebrow="Contact"
          title="Talk to us"
          subtitle="We're a small team — email goes directly to the people building this, not a ticket queue."
        />
      </Section>
      <Section>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 md:grid-cols-2">
            {REASONS.map((r) => (
              <MagicCard key={r.title} className="flex-col h-full bg-white shadow-sm border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{r.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{r.body}</p>
              </MagicCard>
            ))}
          </div>
          <MagicCard className="mt-12 bg-white text-slate-900 border-slate-200 text-center shadow-[0_0_50px_rgba(0,22,102,0.3)] relative overflow-hidden flex flex-col items-center">
            
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider font-mono">Email us directly</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-3 block text-3xl font-bold text-brand hover:text-blue-600 transition-colors relative z-10">
              {CONTACT_EMAIL}
            </a>
            <div className="mt-12 pt-8 border-t border-slate-200 w-full flex flex-col items-center">
               <p className="text-sm text-slate-400 mb-6">Or skip the email and just try it:</p>
               <Link href={INSTALL_URL} className="inline-block">
                 <ShimmerButton background="#001666" className="text-lg px-8 py-2">Connect a GitHub repo</ShimmerButton>
               </Link>
            </div>
          </MagicCard>
        </div>
      </Section>
    </>
  );
}
