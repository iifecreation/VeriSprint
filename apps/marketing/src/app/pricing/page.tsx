import type { Metadata } from "next";
import { PageHeader, Section, Card, CheckIcon, PrimaryButton, SecondaryButton, FAQSection } from "@/components/ui";
import { INSTALL_URL, CONTACT_EMAIL, API_BASE_URL } from "@/lib/config";
import { BorderBeam } from "@/components/magicui/border-beam";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { HeroBackground } from "@/components/HeroBackground";

export const metadata: Metadata = {
  title: "Pricing — VeriSprint",
  description: "Transparent per-developer pricing: Free forever for one repo, Team and Growth tiers starting around $12–35/developer/month, custom Agency and Enterprise tiers.",
};

type LivePlan = { tier: string; price_usd: number; billing_interval: string };

async function getLivePlans(): Promise<Record<string, LivePlan>> {
  try {
    const res = await fetch(`${API_BASE_URL}/pricing-plans`, { next: { revalidate: 300 } });
    if (!res.ok) return {};
    const plans: LivePlan[] = await res.json();
    return Object.fromEntries(plans.map((p) => [p.tier, p]));
  } catch {
    // API unreachable at build/request time — fall back to the static
    // ranges below rather than breaking the page.
    return {};
  }
}

type Tier = {
  key: string;
  name: string;
  fallbackPrice: string;
  fallbackNote?: string;
  description: string;
  fallbackCta: { label: string; href: string };
  highlighted?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    key: "free",
    name: "Free",
    fallbackPrice: "$0",
    fallbackNote: "Forever — no card required",
    description: "One repo, the core Evidence Ledger and Confidence Score pipeline — no time limit.",
    fallbackCta: { label: "Connect a repo", href: INSTALL_URL },
    features: [
      "1 connected repo",
      "Evidence Ledger + Confidence Scores",
      "Claimed vs. shipped reconciliation",
      "Auto-drafted standups",
      "Client Proof-of-Work Portal",
    ],
  },
  {
    key: "team",
    name: "Team",
    fallbackPrice: "$12–20",
    fallbackNote: "per developer / month",
    description: "For a single team shipping across a few repos.",
    fallbackCta: { label: "Contact us", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Team plan` },
    features: ["Everything in Free", "Multiple repos", "Sprint rollups & burndown", "Historical accuracy", "Slack digests", "DORA metrics panel"],
  },
  {
    key: "growth",
    name: "Growth",
    fallbackPrice: "$25–35",
    fallbackNote: "per developer / month",
    description: "For teams that need multi-repo intelligence and deeper reporting.",
    fallbackCta: { label: "Contact us", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Growth plan` },
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
    key: "agency",
    name: "Agency",
    fallbackPrice: "Custom",
    fallbackNote: "Add-on to Growth",
    description: "For agencies delivering work to external clients.",
    fallbackCta: { label: "Contact us", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Agency plan` },
    features: ["Everything in Growth", "White-labeled Client Portal", "Onboarding doc generator", "Priority support"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    fallbackPrice: "Custom",
    fallbackNote: "Sales-assisted onboarding",
    description: "SSO, on-prem/private LLM, and a dedicated setup — provisioned directly, not through self-serve checkout.",
    fallbackCta: { label: "Talk to sales", href: `mailto:${CONTACT_EMAIL}?subject=VeriSprint Enterprise` },
    features: ["Everything in Agency", "SSO (OIDC) + SCIM provisioning", "Private or on-prem LLM option", "Compliance audit trail", "Cost Capitalization reporting"],
  },
];

export default async function PricingPage() {
  const livePlans = await getLivePlans();
  const anyLive = Object.keys(livePlans).length > 0;

  return (
    <>
      <Section
        variant="default"
        className="bg-[var(--background)] pb-16 border-b border-[var(--line)] relative overflow-hidden"
        background={<HeroBackground />}
      >
        <PageHeader
          title="Start free. Upgrade when you need more repos or reporting."
          subtitle={
            anyLive
              ? "The Free tier has no time limit and no credit card required. Team and Growth are self-serve — connect a repo, then subscribe from Settings whenever you're ready."
              : "The Free tier has no time limit and no credit card required. We're in early access, so paid tiers are confirmed directly with our team at launch — the ranges below are our stated pricing direction, not a placeholder."
          }
        />
      </Section>
      <Section className="bg-[var(--background)]">
        <RevealGroup className="mx-auto max-w-7xl grid gap-6 lg:grid-cols-5">
          {TIERS.map((tier) => {
            const live = livePlans[tier.key];
            const price = live ? `$${live.price_usd}` : tier.fallbackPrice;
            const priceNote = live ? `per ${live.billing_interval}` : tier.fallbackNote;
            // Self-serve only kicks in once a Super Admin has actually set a
            // live price for this tier (see the Operator Console's Pricing
            // panel) — until then the original "talk to us" CTA stays put,
            // so this page never claims a checkout flow that isn't real yet.
            const cta = live && (tier.key === "team" || tier.key === "growth")
              ? { label: "Connect a repo, then subscribe", href: INSTALL_URL }
              : tier.fallbackCta;

            return (
              <RevealItem key={tier.key}>
                <Card className={`relative flex flex-col h-full bg-[var(--surface)] transition-all hover:shadow-lg ${tier.highlighted ? 'ring-2 ring-[var(--accent-neon)] shadow-[0_0_20px_rgba(101,163,13,0.15)] -translate-y-2' : 'shadow-sm'}`}>
                  {tier.highlighted && (
                    <>
                      <BorderBeam size={250} duration={12} delay={9} />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--accent-neon)] text-[#04201f] text-xs font-bold uppercase tracking-wider font-monor rounded-full shadow-sm whitespace-nowrap z-10">
                        Most Popular
                      </div>
                    </>
                  )}
                  <div className="mb-6 border-b border-[var(--line)] pb-6">
                    <h3 className="text-xl font-bold text-[var(--foreground)]">{tier.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <p className="text-4xl font-extrabold text-[var(--foreground)] tracking-tight">{price}</p>
                    </div>
                    {priceNote && <p className="mt-2 text-xs font-medium text-[var(--text-dim)] uppercase tracking-wider font-mono">{priceNote}</p>}
                    <p className="mt-4 text-sm text-[var(--text-muted)] leading-relaxed">{tier.description}</p>
                  </div>
                  <ul className="flex-1 space-y-3 mb-8">
                    {tier.features.map((f) => (
                      <li key={f} className="flex gap-3 text-sm text-[var(--text-muted)]">
                        <span className="flex-shrink-0 text-[var(--accent-neon)]"><CheckIcon /></span>
                        <span className="leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    {tier.highlighted ? (
                      <PrimaryButton href={cta.href} className="w-full justify-center">{cta.label}</PrimaryButton>
                    ) : (
                      <SecondaryButton href={cta.href} className="w-full justify-center border-[var(--line)]">{cta.label}</SecondaryButton>
                    )}
                  </div>
                </Card>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </Section>

      <Section variant="default">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Pricing FAQ</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">Before you talk to us</h2>
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
              question: "How does self-serve billing work?",
              answer: "Connect a repo first (that's what creates your workspace), then subscribe from Settings → Plan & Billing whenever you're ready. You can pay by card via Stripe, or via Paystack if your business is based somewhere Stripe doesn't support payouts to.",
            },
            {
              question: "Is there a discount for annual billing?",
              answer: "Not decided yet publicly — ask when you reach out and we'll tell you where that stands.",
            },
          ]}
        />
      </Section>

      <Section variant="default" className="bg-[var(--background)] border-t border-[var(--line)]">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Questions about a plan?</h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">
            Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-brand hover:text-brand transition-colors">
              {CONTACT_EMAIL}
            </a>{" "}
            and we&apos;ll get back to you.
          </p>
        </Reveal>
      </Section>
    </>
  );
}
