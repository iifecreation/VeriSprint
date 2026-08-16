import type { Metadata } from "next";
import { PageHeader, Section, Card, CheckIcon, PrimaryButton, SecondaryButton } from "@/components/ui";
import { INSTALL_URL, CONTACT_EMAIL } from "@/lib/config";

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
    features: ["Everything in Free", "Multiple repos", "Sprint rollups & burndown", "Historical accuracy", "Slack digests"],
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
      "ROI calculator",
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
    features: ["Everything in Agency", "SSO (OIDC/SAML)", "Private or on-prem LLM option", "Compliance audit trail export", "Dedicated support"],
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Pricing"
        title="Start free. Upgrade when you need more repos or reporting."
        subtitle="We're in early access, so paid pricing is confirmed directly with our team rather than a fixed self-serve price — the Free tier itself has no time limit and no credit card required."
      />
      <Section>
        <div className="grid gap-6 lg:grid-cols-5">
          {TIERS.map((tier) => (
            <Card key={tier.name} className={tier.highlighted ? "border-indigo-300 ring-1 ring-indigo-200" : ""}>
              <h3 className="text-lg font-semibold text-slate-900">{tier.name}</h3>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{tier.price}</p>
              {tier.priceNote && <p className="mt-1 text-xs text-slate-400">{tier.priceNote}</p>}
              <p className="mt-3 text-sm text-slate-600">{tier.description}</p>
              <ul className="mt-5 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-600">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {tier.highlighted ? (
                  <PrimaryButton href={tier.cta.href}>{tier.cta.label}</PrimaryButton>
                ) : (
                  <SecondaryButton href={tier.cta.href}>{tier.cta.label}</SecondaryButton>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Section>
      <Section muted>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold text-slate-900">Questions about a plan?</h2>
          <p className="mt-2 text-slate-600">
            Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-indigo-600 hover:text-indigo-700">
              {CONTACT_EMAIL}
            </a>{" "}
            and we&apos;ll get back to you.
          </p>
        </div>
      </Section>
    </>
  );
}
