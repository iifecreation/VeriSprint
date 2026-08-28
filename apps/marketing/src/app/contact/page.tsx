import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/config";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { MagicCard } from "@/components/magicui/magic-card";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { HeroBackground } from "@/components/HeroBackground";
import { ContactForm } from "@/components/ContactForm";
import { cardAccent } from "@/lib/palette";
import { Building2, ShieldQuestion, FlagTriangleRight, MessageCircleQuestion } from "lucide-react";

export const metadata: Metadata = { title: "Contact — VeriSprint" };

const REASONS = [
  { icon: Building2, title: "Enterprise & Agency plans", body: "SSO, on-prem LLM, white-labeled Client Portal, or a dedicated setup call." },
  { icon: ShieldQuestion, title: "Security questions", body: "Anything about how VeriSprint handles your code, scopes, or workspace isolation." },
  { icon: FlagTriangleRight, title: "Something looks wrong", body: "A page claiming a capability that doesn't actually work as described — please tell us." },
  { icon: MessageCircleQuestion, title: "Anything else", body: "General questions, feedback, or partnership inquiries." },
];

export default function ContactPage() {
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
          title="Talk to us"
          subtitle="We're a small team — every message below lands directly with the people building this, not a ticket queue."
        />
      </Section>
      <Section>
        <div className="mx-auto max-w-4xl">
          <RevealGroup className="grid gap-6 md:grid-cols-2">
            {REASONS.map((r, i) => {
              const accent = cardAccent(i);
              return (
                <RevealItem key={r.title}>
                  <MagicCard className="flex h-full flex-col bg-[var(--surface)] shadow-sm border-[var(--line)]">
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
                      <r.icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">{r.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{r.body}</p>
                  </MagicCard>
                </RevealItem>
              );
            })}
          </RevealGroup>

          <Reveal delay={0.15}>
            <MagicCard className="mt-12 bg-[var(--surface)] text-[var(--foreground)] border-[var(--line)] shadow-[0_0_50px_rgba(79,184,196,0.3)] relative overflow-hidden">
              <p className="text-center text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wider font-mono">Send us a message</p>
              <div className="mx-auto mt-6 max-w-lg">
                <ContactForm />
              </div>
              <div className="mx-auto mt-10 max-w-lg border-t border-[var(--line)] pt-6 text-center">
                <p className="text-sm text-[var(--text-dim)]">
                  Prefer email? Write to us directly at{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand hover:text-brand transition-colors">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </MagicCard>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
