import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy — VeriSprint",
  description: "What VeriSprint collects, why, who it's shared with, and how to exercise your data rights.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Privacy Policy" effectiveDate="August 2026">
      <p>
        This policy covers the VeriSprint web application, the GitHub App integration, and the public marketing
        site. It applies to workspace users (developers, managers, workspace admins) and to Client Portal
        recipients who receive a scoped, revocable link but never create a full account.
      </p>

      <h2>1. What we collect</h2>
      <p>Depending on how you use VeriSprint, we collect:</p>
      <ul>
        <li>
          <strong>Account data:</strong> name, email, GitHub login and avatar (if you sign in with GitHub), role,
          and workspace membership.
        </li>
        <li>
          <strong>Repository data, via the GitHub App&apos;s read-only scopes:</strong> commit metadata and diffs,
          pull request metadata, and file paths for repositories you explicitly connect. We never request write
          access — see{" "}
          <a href="/security" className="text-brand underline">
            Security
          </a>
          .
        </li>
        <li>
          <strong>Ticket data:</strong> ticket keys, titles, statuses, and acceptance criteria you enter manually
          or sync from Jira/Linear, if you connect one.
        </li>
        <li>
          <strong>Usage data:</strong> pages visited, features used, and API request logs, retained for debugging
          and the Super-Admin observability pipeline described in our production architecture.
        </li>
        <li>
          <strong>Billing data:</strong> plan tier and subscription status. Card details are handled entirely by
          Stripe — VeriSprint never stores raw payment card numbers.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To run the core product: generating the Evidence Ledger, Confidence Scores, standups, reports, and every other feature described on the Features page.</li>
        <li>To send diffs and commit context to an LLM provider for analysis (see Section 3) — and to nowhere else.</li>
        <li>To operate, secure, and debug the service, including the error/metrics pipeline that powers our internal Super-Admin Dashboard.</li>
        <li>To send account, billing, and (if you opt in) digest emails.</li>
        <li>To enforce our Terms of Service and investigate abuse.</li>
      </ul>
      <p>
        We do not sell personal data, and we do not use your code or commit history to train any AI model —
        Anthropic&apos;s API terms (our default LLM provider) contractually exclude API inputs from model training,
        and if you point VeriSprint at a self-hosted LLM instead, your data never leaves infrastructure you control
        in the first place.
      </p>

      <h2>3. Who we share it with</h2>
      <p>
        We use a small number of subprocessors to run the service, each of which only receives the data it needs
        to do its one job:
      </p>
      <ul>
        <li><strong>GitHub</strong> — the source of the repository data itself, via OAuth and the GitHub App.</li>
        <li><strong>Anthropic (Claude API), or your own self-hosted LLM endpoint</strong> — receives diff and file content for the single analysis call that generates each Evidence Item; see Section 2.</li>
        <li><strong>Stripe</strong> — payment processing and subscription billing, for paid workspaces.</li>
        <li><strong>Resend</strong> — transactional and digest email delivery.</li>
        <li><strong>Amazon Web Services (S3)</strong> — encrypted storage of raw commit diffs.</li>
        <li><strong>Sentry</strong> — error tracking, if configured; disabled by default (see our{" "}
          <a href="/status" className="text-brand underline">Status page</a> for what feeds our own error monitoring without it).</li>
        <li><strong>Slack</strong> — only if you connect it, for digest delivery and Blocker Nudge Bot alerts.</li>
      </ul>
      <p>We never share data with data brokers or ad networks, and we don&apos;t run ads.</p>

      <h2>4. Data retention</h2>
      <p>
        Repository and workspace data is retained for as long as your workspace stays connected. If you disconnect
        a repo or delete your workspace, we delete the associated Evidence Items, diffs, and derived scores within
        30 days, except where we&apos;re required to retain audit-log or billing records for legal or accounting
        purposes.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Depending on where you&apos;re located, you may have the right to access, correct, export, or delete your
        personal data, and to object to or restrict certain processing. You can exercise most of these directly —
        the Audit Log export and account settings cover the common cases — or email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">
          {CONTACT_EMAIL}
        </a>{" "}
        and we&apos;ll handle it manually while that self-serve tooling matures.
      </p>

      <h2>6. Client Portal recipients</h2>
      <p>
        If you receive a Client Proof-of-Work Portal link, we only process what&apos;s necessary to serve that
        one report: the report content itself and, if you view it, basic access logs (timestamp, so the workspace
        owner can see whether it&apos;s been viewed). Portal links are revocable by the workspace owner at any
        time and expire automatically.
      </p>

      <h2>7. Security</h2>
      <p>
        See the dedicated{" "}
        <a href="/security" className="text-brand underline">
          Security &amp; Trust
        </a>{" "}
        page for the full breakdown of read-only scopes, tenant isolation, RBAC, and audit logging.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        If we make a material change, we&apos;ll update the effective date above and, for workspace users, note it
        in-app. We won&apos;t narrow your rights under this policy retroactively without asking first.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy or a specific data request:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalLayout>
  );
}
