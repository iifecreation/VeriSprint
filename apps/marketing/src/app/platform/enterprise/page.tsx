import type { Metadata } from "next";
import Link from "next/link";
import { Section, PageHeader, FAQSection, SecondaryButton } from "@/components/ui";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { HeroBackground } from "@/components/HeroBackground";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";
import { PlatformSubNav, PlatformPagination } from "@/components/PlatformNav";
import { INSTALL_URL } from "@/lib/config";
import {
  KeyRound,
  FileCheck2,
  Cable,
  ServerCog,
  ShieldCheck,
  Lock,
  Database,
  CheckCircle2,
  Cpu,
  FileText,
  Building,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Enterprise & Compliance — VeriSprint Platform",
  description:
    "Enterprise SSO/SCIM, immutable audit logging, 5-role RBAC, SOC 2 compliance, and private on-premise LLM execution on your own VPC infrastructure.",
};

const AUDIT_LOG_SAMPLES = [
  {
    timestamp: "2026-10-11 07:14:22 UTC",
    actor: "sarah.connor@acme.com",
    role: "OrgAdmin",
    action: "export.cost_capitalization_q3",
    ip: "198.51.100.42",
    hash: "sha256:7f8a3c...b912",
  },
  {
    timestamp: "2026-10-11 06:42:01 UTC",
    actor: "system.scim_sync",
    role: "SCIM Daemon",
    action: "user.provision_squad_membership",
    ip: "okta.internal.gateway",
    hash: "sha256:e41d8a...119c",
  },
  {
    timestamp: "2026-10-11 05:12:18 UTC",
    actor: "alex.chen@acme.com",
    role: "EngManager",
    action: "feature_flag.enable_dora_panel",
    ip: "198.51.100.88",
    hash: "sha256:88921a...43da",
  },
];

const RBAC_ROLES = [
  {
    role: "Super-Admin",
    scope: "Workspace owner",
    permissions: "Billing, enterprise SSO/SCIM, full audit export, private LLM gateway config, role assignment.",
  },
  {
    role: "Org Admin",
    scope: "Engineering Director / VP",
    permissions: "Enable/disable feature flags, configure teams and multi-repo services, set capitalization rates.",
  },
  {
    role: "Engineering Manager",
    scope: "Squad Lead / EM",
    permissions: "View squad DORA metrics, manage living working agreements, receive blocker nudges.",
  },
  {
    role: "Developer",
    scope: "Individual Contributor",
    permissions: "Review and post auto-drafted standups, inspect own ticket Evidence Ledgers, query AI Repo Chat.",
  },
  {
    role: "Auditor",
    scope: "Read-only external auditor",
    permissions: "Export timestamped R&D capitalization summaries and immutable audit trails; zero source access.",
  },
];

export default function EnterpriseCompliancePage() {
  return (
    <>
      <PlatformSubNav />

      {/* Hero */}
      <Section
        variant="default"
        className="bg-[var(--background)] pb-20 border-b border-[var(--line)] relative overflow-hidden"
        background={
          <>
            <HeroBackground />
            <DotPattern className="opacity-35" />
          </>
        }
      >
        <div className="mx-auto max-w-4xl text-center relative z-20">
          <p className="inline-flex items-center rounded-full bg-brand/15 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--accent-neon)] ring-1 ring-[var(--accent-neon)]/30 mb-6">
            Product 6 of 6 — Enterprise Security & Compliance
          </p>
          <PageHeader
            title="Enterprise & Compliance"
            subtitle="What security reviews, SOC 2 auditors, and regulated enterprise customers demand — SSO, SCIM 2.0 provisioning, immutable audit trails, and private on-premise LLMs on infrastructure you control."
          />

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm text-center">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-dim)]">Code Privacy Commitment</span>
            <p className="text-5xl font-bold font-mono text-[var(--foreground)] mt-2">0 Bytes</p>
            <p className="mt-2 text-sm text-[var(--text-dim)] leading-snug">
              Of your code is ever retained or used to train any third-party artificial intelligence model.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact">
              <ShimmerButton background="#4fb8c4" className="text-base px-8 py-3">
                Talk to Enterprise Security
              </ShimmerButton>
            </Link>
            <SecondaryButton href="#private-llm">Review Private LLM Architecture ↓</SecondaryButton>
          </div>
        </div>
      </Section>

      {/* Private On-Prem LLM Architecture */}
      <Section variant="sky" id="private-llm" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Air-Gapped &amp; Private</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Private / On-Premise LLM Inference
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            For defense, healthcare, and financial services customers who cannot send diffs to external cloud APIs: run the entire VeriSprint analysis pipeline against self-hosted models in your own VPC.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--line)] gap-4">
            <div>
              <span className="text-xs font-mono text-[var(--text-dim)] uppercase">Private Gateway Integration</span>
              <h3 className="text-xl font-bold text-[var(--foreground)] mt-1">OpenAI-Compatible Internal Endpoints</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-bold">
                Zero Data Egress Mode
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-5">
              <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
                <ServerCog className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[var(--foreground)]">vLLM &amp; Ollama</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Point VeriSprint directly at your internal vLLM cluster or Ollama instance running open weights (Llama 3, Qwen, DeepSeek).
              </p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-5">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                <Database className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[var(--foreground)]">Azure OpenAI Private Link</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Connect via internal VNet / VPC peering with zero public internet routing and HIPAA/FedRAMP compliant tenancy.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-5">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
                <Cpu className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-[var(--foreground)]">Local AST &amp; Vector Embeddings</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Syntax parsing and pgvector embeddings execute locally in your Postgres cluster with zero third-party calls.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Immutable Audit Log */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Regulatory Audit Trail</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Cryptographically Verifiable Audit Logs
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Every privileged action — report exports, feature flag toggles, role assignments, and SCIM synchronization — is immutably recorded with actor identity and SHA-256 integrity hashes.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] text-xs font-mono text-[var(--text-dim)]">
            <span>Live Security Audit Feed</span>
            <span className="text-brand">SOC 2 Type II Compliant Schema</span>
          </div>

          <div className="mt-4 space-y-3 font-mono text-xs">
            {AUDIT_LOG_SAMPLES.map((log) => (
              <div
                key={log.hash}
                className="rounded-xl border border-[var(--line)] bg-[var(--background)]/70 p-4 hover:border-brand/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-brand font-bold">{log.action}</span>
                    <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-[10px] text-[var(--text-dim)]">
                      {log.role}
                    </span>
                  </div>
                  <div className="text-[var(--text-muted)] mt-1">
                    Actor: {log.actor} | IP: {log.ip}
                  </div>
                </div>

                <div className="text-right text-[11px] text-[var(--text-dim)] shrink-0">
                  <div>{log.timestamp}</div>
                  <div className="text-[10px] font-mono text-brand/80">{log.hash}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--text-dim)]">
            <span>Exportable on demand via REST API or one-click CSV download for compliance reviews.</span>
            <span className="text-brand font-mono font-semibold">Retention: 365 Days</span>
          </div>
        </div>
      </Section>

      {/* RBAC 5-Role Matrix */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Access Control</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            5-Role Role-Based Access Control (RBAC)
          </h2>
          <p className="mt-4 text-base text-[var(--text-muted)] leading-relaxed">
            Granular permissions that map naturally to your engineering hierarchy and external audit requirements.
          </p>
        </Reveal>

        <div className="mx-auto max-w-5xl space-y-4">
          {RBAC_ROLES.map((r) => (
            <div
              key={r.role}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="sm:w-1/3">
                <h4 className="text-base font-bold text-[var(--foreground)]">{r.role}</h4>
                <span className="text-xs font-mono text-brand">{r.scope}</span>
              </div>
              <div className="sm:w-2/3 text-xs text-[var(--text-muted)] leading-relaxed">
                {r.permissions}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Feature Lineup */}
      <Section variant="default" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Feature Lineup</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            Everything in Enterprise & Compliance
          </h2>
        </Reveal>

        <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-3">
              <KeyRound className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">SSO / SCIM</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Enterprise single sign-on plus SCIM 2.0 user provisioning for Okta, Azure AD, and Google Workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Compliance & Audit Trail</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              An exportable, timestamped record tying every privileged action to its actor for regulatory proof of process.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3">
              <Cable className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Open Integration Framework</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              A consistent lifecycle for integrations beyond GitHub: Linear, Jira, Slack, PagerDuty, Datadog.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
              <ServerCog className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Private / On-Prem LLM</h4>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Point analysis at self-hosted, OpenAI-compatible models on infrastructure you fully own and control.
            </p>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="sky" className="border-b border-[var(--line)]">
        <Reveal className="mx-auto max-w-3xl text-center mb-12">
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand mb-3">Common Questions</p>
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight sm:text-4xl">
            About Enterprise & Compliance
          </h2>
        </Reveal>
        <Reveal>
          <FAQSection
            items={[
              {
                question: "Which identity providers are supported for SSO and SCIM?",
                answer:
                  "VeriSprint supports SAML 2.0 and OIDC single sign-on with Okta, Microsoft Entra ID (Azure AD), Google Workspace, OneLogin, and PingIdentity, with automated user provisioning via SCIM 2.0.",
              },
              {
                question: "Do you offer custom BAA or DPA agreements?",
                answer:
                  "Yes. Enterprise plans include custom Data Processing Agreements (DPAs) with Standard Contractual Clauses (SCCs) and Business Associate Agreements (BAAs) for HIPAA compliance.",
              },
              {
                question: "Can we deploy VeriSprint fully air-gapped?",
                answer:
                  "Yes. Our enterprise tier supports air-gapped on-premise deployment via self-contained Kubernetes Helm charts or Docker Compose with local Postgres, Redis, and internal vLLM inference gateways.",
              },
            ]}
          />
        </Reveal>
      </Section>

      <PlatformPagination currentSlug="enterprise" />

      {/* CTA */}
      <Section variant="default">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
            Schedule an Enterprise Security Review
          </h2>
          <p className="mt-4 text-[var(--text-muted)] text-lg">
            Speak with our engineering leadership and review our architectural trust documentation.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/contact">
              <ShimmerButton background="#4fb8c4" className="text-lg px-8 py-2">
                Contact Enterprise Sales
              </ShimmerButton>
            </Link>
            <Link href="/security" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors">
              View Security & Trust Center →
            </Link>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
