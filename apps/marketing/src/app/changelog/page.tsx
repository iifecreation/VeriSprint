import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Changelog — VeriSprint" };

const RELEASES = [
  {
    version: "v3.0 — Production hardening",
    items: [
      "Full multi-tenant workspace isolation: every request scoped server-side by JWT-embedded workspace_id",
      "Five-role RBAC (Workspace Admin, Manager, Developer, Client Portal, and an internal Super Admin role)",
      "Email/password login as a fallback to GitHub OAuth, plus team invites and password reset",
      "Append-only audit trail covering role changes, billing changes, integration connect/disconnect, and data exports",
      "Error monitoring and system-health metrics feeding an internal operator dashboard",
      "Stripe-backed billing with a self-serve Free tier and workspace-level feature flag gating",
    ],
  },
  {
    version: "v2.0 — Phase 2/3 feature set",
    items: [
      "AI Repo Chat with citations back to real evidence",
      "Sprint rollups, investor updates, and onboarding doc generation",
      "Confidence-weighted burndown charts",
      "Historical accuracy scoring and the async-standup ROI calculator",
      "Ticket Drift Detector and Orphan Commit Detector",
      "Multi-repo intelligence for tickets that span more than one repo",
      "Client Proof-of-Work Portal with white-labeled branding",
      "Slack digest delivery and enterprise SSO (OIDC)",
    ],
  },
  {
    version: "v1.0 — MVP",
    items: [
      "GitHub App install flow and push/PR ingestion",
      "LLM-backed diff analysis producing structured Evidence Items",
      "Per-ticket Confidence Scores with a visible rationale",
      "Claimed-vs-shipped reconciliation flags",
      "Auto-drafted daily standups",
      "PM dashboard and developer view",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <PageHeader eyebrow="Changelog" title="What's shipped." />
      <Section>
        <div className="mx-auto max-w-2xl space-y-12">
          {RELEASES.map((release) => (
            <div key={release.version}>
              <h2 className="text-lg font-semibold text-slate-900">{release.version}</h2>
              <ul className="mt-4 space-y-2 border-l border-slate-200 pl-4">
                {release.items.map((item) => (
                  <li key={item} className="text-sm text-slate-600">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
