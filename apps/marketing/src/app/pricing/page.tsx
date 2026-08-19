import type { Metadata } from "next";
import { PageHeader, Section, Card, CheckIcon, PrimaryButton, SecondaryButton, FAQSection } from "@/components/ui";
import { INSTALL_URL, CONTACT_EMAIL } from "@/lib/config";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Pricing — VeriSprint",
  description: "Transparent per-developer pricing: Free forever for one repo, Team and Growth tiers starting around $12–35/developer/month, custom Agency and Enterprise tiers.",
};

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
    priceNote: "Forever — no card required",
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
    price: "$12–20",
    priceNote: "per developer / month",
    description: "For a single team shipping across a few repos.",
    cta: { label: "Contact us", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Team plan` },
    features: ["Everything in Free", "Multiple repos", "Sprint rollups & burndown", "Historical accuracy", "Slack digests", "DORA metrics panel"],
  },
  {
    name: "Growth",
    price: "$25–35",
    priceNote: "per developer / month",
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
    priceNote: "Add-on to Growth",
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
          subtitle="The Free tier has no time limit and no credit card required. We're in early access, so paid tiers are confirmed directly with our team at launch — the ranges below are our stated pricing direction, not a placeholder."
        />
      </Section>
      <Section className="bg-slate-50">
        <RevealGroup className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-5">
          {TIERS.map((tier) => (
            <RevealItem key={tier.name}>
              <Card className={`relative flex flex-col h-full bg-white transition-all hover:shadow-lg ${tier.highlighted ? 'ring-2 ring-[var(--accent-neon)] shadow-[0_0_20px_rgba(101,163,13,0.15)] -translate-y-2' : 'shadow-sm'}`}>
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
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Pricing FAQ</p>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight sm:text-4xl">Before you talk to us</h2>
        </Reveal>
        <FAQSection
          items={[
            {
              question: "What counts as a \"developer\" seat?",
              answer: "Anyone with a Developer, Manager, or Workspace Admin role in a workspace. The read-only Client Portal role — used for external clients checking a proof-of-work link — is never counted as a seat.",
            },
            {
              question: "Can I stay on Free indefinitely?",
              answer: "Yes. The Free tier has no time limit and doesn't require a credit card — it's the same free standup-summary and single-repo Evidence Ledger whether you're evaluating it for a day or running it for a year.",
            },
            {
              question: "Do Phase 2/3 features cost extra on top of a tier?",
              answer: "No — every feature listed under a tier is included at that tier's price once your workspace is provisioned. There's no separate metered add-on pricing beyond the named tiers above (Agency and Enterprise are the exception, priced as their own add-ons).",
            },
            {
              question: "Why isn't Team/Growth a fixed self-serve checkout yet?",
              answer: "We're in early access — pricing at those tiers is confirmed directly with our team so we can get it right before turning on self-serve billing at volume. The ranges above are our real, stated pricing direction, not a bait-and-switch placeholder.",
            },
            {
              question: "Is there a discount for annual billing?",
              answer: "Not decided yet publicly — ask when you reach out and we'll tell you where that stands.",
            },
          ]}
        />
      </Section>

      <Section variant="default" className="bg-slate-50 border-t border-slate-200">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Questions about a plan?</h2>
          <p className="mt-4 text-slate-600 text-lg">
            Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand hover:text-blue-600 transition-colors">
              {CONTACT_EMAIL}
            </a>{" "}
            and we&apos;ll get back to you.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
