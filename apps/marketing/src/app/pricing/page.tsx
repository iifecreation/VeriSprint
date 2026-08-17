import type { Metadata } from "next";
import { PageHeader, Section, Card, CheckIcon, PrimaryButton, SecondaryButton } from "@/components/ui";
import { INSTALL_URL, CONTACT_EMAIL } from "@/lib/config";
import { BorderBeam } from "@/components/magicui/border-beam";

export const metadata: Metadata = { title: "Pricing — VeriSprint" };

type Tier = {
  name: string;
  price: string;
  priceNote?: string;
  description: string;
  cta: { label: string; href: string };
  highlighted?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    description: "One repo, the core Evidence Ledger and Confidence Score pipeline — no time limit.",
    cta: { label: "Connect a repo", href: INSTALL_URL },
    features: [
      "1 connected repo",
      "Evidence Ledger + Confidence Scores",
      "Claimed vs. shipped reconciliation",
      "Auto-drafted standups",
      "Client Proof-of-Work Portal",
    ],
  },
  {
    name: "Team",
    price: "Custom",
    priceNote: "Talk to us for current pricing",
    description: "For a single team shipping across a few repos.",
    cta: { label: "Contact us", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Team plan` },
    features: ["Everything in Free", "Multiple repos", "Sprint rollups & burndown", "Historical accuracy", "Slack digests", "DORA metrics panel"],
  },
  {
    name: "Growth",
    price: "Custom",
    priceNote: "Talk to us for current pricing",
    description: "For teams that need multi-repo intelligence and deeper reporting.",
    cta: { label: "Contact us", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Growth plan` },
    highlighted: true,
    features: [
      "Everything in Team",
      "Multi-repo intelligence",
      "Investor updates",
      "Risk Radar & Delivery Forecast",
      "Investment Allocation",
      "Anomaly check-in nudges",
    ],
  },
  {
    name: "Agency",
    price: "Custom",
    priceNote: "Talk to us for current pricing",
    description: "For agencies delivering work to external clients.",
    cta: { label: "Contact us", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Agency plan` },
    features: ["Everything in Growth", "White-labeled Client Portal", "Onboarding doc generator", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceNote: "Sales-assisted onboarding",
    description: "SSO, on-prem/private LLM, and a dedicated setup — provisioned directly, not through self-serve checkout.",
    cta: { label: "Talk to sales", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Enterprise` },
    features: ["Everything in Agency", "SSO (OIDC/SAML)", "Private or on-prem LLM option", "Compliance audit trail", "Cost Capitalization reporting"],
  },
];

export default function PricingPage() {
  return (
    <>
      <Section variant="default" className="bg-slate-50 pb-16 pt-20 border-b border-slate-200">
        <PageHeader
          eyebrow="Pricing"
          title="Start free. Upgrade when you need more repos or reporting."
          subtitle="We're in early access, so paid pricing is confirmed directly with our team rather than a fixed self-serve price — the Free tier itself has no time limit and no credit card required."
        />
      </Section>
      <Section className="bg-slate-50">
        <div className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-5">
          {TIERS.map((tier) => (
            <Card key={tier.name} className={`relative flex flex-col h-full bg-white transition-all hover:shadow-lg ${tier.highlighted ? 'ring-2 ring-[var(--accent-neon)] shadow-[0_0_20px_rgba(101,163,13,0.15)] -translate-y-2' : 'shadow-sm'}`}>
              {tier.highlighted && (
                <>
                  <BorderBeam size={250} duration={12} delay={9} />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--accent-neon)] text-slate-900 text-xs font-bold uppercase tracking-wider font-monor rounded-full shadow-sm whitespace-nowrap z-10">
                    Most Popular
                  </div>
                </>
              )}
              <div className="mb-6 border-b border-slate-200 pb-6">
                <h3 className="text-xl font-bold text-slate-900">{tier.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                   <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{tier.price}</p>
                </div>
                {tier.priceNote && <p className="mt-2 text-xs font-medium text-slate-500 uppercase tracking-wider font-mono">{tier.priceNote}</p>}
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">{tier.description}</p>
              </div>
              <ul className="flex-1 space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-3 text-sm text-slate-600">
                    <span className="flex-shrink-0 text-blue-500"><CheckIcon /></span>
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">
                {tier.highlighted ? (
                  <PrimaryButton href={tier.cta.href} className="w-full justify-center">{tier.cta.label}</PrimaryButton>
                ) : (
                  <SecondaryButton href={tier.cta.href} className="w-full justify-center border-slate-200">{tier.cta.label}</SecondaryButton>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Section>
      <Section variant="default" className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Questions about a plan?</h2>
          <p className="mt-4 text-slate-600 text-lg">
            Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand hover:text-blue-600 transition-colors">
              {CONTACT_EMAIL}
            </a>{" "}
            and we&apos;ll get back to you.
          </p>
        </div>
      </Section>
    </>
  );
}
