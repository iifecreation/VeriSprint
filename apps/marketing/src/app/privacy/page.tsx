import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy — VeriSprint",
  description: "What VeriSprint collects, why, the legal basis for processing it, who it's shared with, how long it's kept, and how to exercise your data rights under GDPR/CCPA.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Privacy Policy" effectiveDate="August 2026">
      <p>
        This policy covers the VeriSprint web application, the GitHub App integration, and the public marketing
        site. It applies to workspace users (developers, managers, workspace admins), to visitors of the public
        site, and to Client Portal recipients who receive a scoped, revocable link but never create a full
        account.
      </p>

      <h2>1. Who we are and what this policy covers</h2>
      <p>
        VeriSprint is the data controller for the personal data described below when you use the product directly
        (account data, billing data, usage data), and a data processor for the repository/ticket data a workspace
        connects on its own behalf — see our{" "}
        <a href="/dpa" className="text-brand underline">Data Processing Agreement</a> for that split in detail if
        your organization needs it spelled out for procurement.
      </p>

      <h2>2. What we collect</h2>
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
        <li>
          <strong>Contact form submissions:</strong> the name, email, and message you submit through the public
          site&apos;s Contact page — used only to respond to you, and visible internally to the small team
          operating VeriSprint.
        </li>
        <li>
          <strong>Cookies and similar technologies:</strong> we use a minimal set of strictly-necessary cookies for
          session authentication (keeping you signed in) — no third-party advertising or cross-site tracking
          cookies. See Section 9.
        </li>
      </ul>

      <h2>3. Why we process it (legal basis)</h2>
      <p>For visitors and users in jurisdictions where a legal basis must be stated (e.g. under GDPR), we rely on:</p>
      <ul>
        <li><strong>Contract:</strong> account, repository, and billing data — necessary to provide the service you signed up for.</li>
        <li><strong>Legitimate interest:</strong> usage/security data, used to keep the service running, debug failures, and prevent abuse — balanced against your privacy, and never used to build an advertising profile.</li>
        <li><strong>Consent:</strong> optional digest emails and the Contact form, which you actively choose to send.</li>
        <li><strong>Legal obligation:</strong> billing records retained for tax/accounting compliance.</li>
      </ul>

      <h2>4. How we use it</h2>
      <ul>
        <li>To run the core product: generating the Evidence Ledger, Confidence Scores, standups, reports, and every other feature described on the Features page.</li>
        <li>To send diffs and commit context to an LLM provider for analysis (see Section 6) — and to nowhere else.</li>
        <li>To operate, secure, and debug the service, including the error/metrics pipeline that powers our internal Super-Admin Dashboard.</li>
        <li>To send account, billing, and (if you opt in) digest emails.</li>
        <li>To respond to messages sent through the Contact form.</li>
        <li>To enforce our Terms of Service and investigate abuse.</li>
      </ul>
      <p>
        We do not sell personal data, we don&apos;t run ads or build advertising profiles, and we do not use your
        code or commit history to train any AI model — Anthropic&apos;s API terms (our default LLM provider)
        contractually exclude API inputs from model training, and if you point VeriSprint at a self-hosted LLM
        instead, your data never leaves infrastructure you control in the first place.
      </p>

      <h2>5. Who we share it with</h2>
      <p>
        We use a small number of subprocessors to run the service, each of which only receives the data it needs
        to do its one job:
      </p>
      <ul>
        <li><strong>GitHub</strong> — the source of the repository data itself, via OAuth and the GitHub App.</li>
        <li><strong>Anthropic (Claude API), or your own self-hosted LLM endpoint</strong> — receives diff and file content for the single analysis call that generates each Evidence Item.</li>
        <li><strong>Stripe</strong> — payment processing and subscription billing, for paid workspaces.</li>
        <li><strong>Resend</strong> — transactional and digest email delivery, and Contact form notifications.</li>
        <li><strong>Amazon Web Services (S3)</strong> — encrypted storage of raw commit diffs.</li>
        <li><strong>Sentry</strong> — error tracking, if configured; disabled by default (see our{" "}
          <a href="/status" className="text-brand underline">Status page</a> for what feeds our own error monitoring without it).</li>
        <li><strong>Slack</strong> — only if you connect it, for digest delivery and Blocker Nudge Bot alerts.</li>
      </ul>
      <p>
        We never share data with data brokers or ad networks. We disclose data to law enforcement only when legally
        compelled (e.g. a valid subpoena), and only to the extent required.
      </p>

      <h2>6. International data transfers</h2>
      <p>
        Our subprocessors above may process data outside your country, including in the United States. Where that
        requires a transfer mechanism (e.g. under GDPR), we rely on our subprocessors&apos; own Standard
        Contractual Clauses or equivalent safeguards. If cross-border transfer is a blocker for your organization,
        the self-hosted LLM option (Section 4) and Enterprise-tier deployment options reduce what leaves your own
        infrastructure in the first place — email us and we&apos;ll walk through what applies to you.
      </p>

      <h2>7. Data retention</h2>
      <p>
        Repository and workspace data is retained for as long as your workspace stays connected. If you disconnect
        a repo or delete your workspace, we delete the associated Evidence Items, diffs, and derived scores within
        30 days, except where we&apos;re required to retain audit-log or billing records for legal or accounting
        purposes (typically 7 years for financial records). Contact form submissions are retained for 24 months
        after resolution, or until you ask us to delete them sooner.
      </p>

      <h2>8. Your rights</h2>
      <p>
        Depending on where you&apos;re located, you may have the right to:
      </p>
      <ul>
        <li><strong>Access</strong> the personal data we hold about you.</li>
        <li><strong>Correct</strong> inaccurate data.</li>
        <li><strong>Delete</strong> your data (&ldquo;right to erasure&rdquo;), subject to the retention exceptions above.</li>
        <li><strong>Export</strong> your data in a portable format.</li>
        <li><strong>Object to or restrict</strong> certain processing based on legitimate interest.</li>
        <li><strong>Withdraw consent</strong> at any time for anything based on consent (e.g. digest emails).</li>
        <li><strong>Lodge a complaint</strong> with your local data protection authority if you believe we&apos;ve mishandled your data.</li>
      </ul>
      <p>
        California residents have equivalent rights under the CCPA/CPRA, including the right to know, delete, and
        opt out of &ldquo;sale&rdquo; of personal information — we don&apos;t sell personal information, so there&apos;s
        nothing to opt out of, but the request channel below still applies to every other right listed here.
      </p>
      <p>
        You can exercise most of these directly — the Audit Log export and account settings cover the common cases
        — or email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">
          {CONTACT_EMAIL}
        </a>{" "}
        and we&apos;ll handle it manually while that self-serve tooling matures. We aim to respond within 30 days.
      </p>

      <h2>9. Cookies</h2>
      <p>
        The authenticated app sets one strictly-necessary session cookie/token to keep you signed in — this isn&apos;t
        optional and isn&apos;t covered by a cookie-consent banner, the same way a bank&apos;s login session
        wouldn&apos;t be. The public marketing site sets no tracking or advertising cookies at all.
      </p>

      <h2>10. Children&apos;s privacy</h2>
      <p>
        VeriSprint is a B2B developer tool, not directed at children, and we don&apos;t knowingly collect personal
        data from anyone under 16. If you believe a child has provided us data, contact us and we&apos;ll delete it.
      </p>

      <h2>11. Data breach notification</h2>
      <p>
        If a security incident results in unauthorized access to your personal data, we&apos;ll notify affected
        workspace admins without undue delay and, where legally required, the relevant supervisory authority —
        consistent with the audit-trail and observability discipline described on the{" "}
        <a href="/security" className="text-brand underline">Security</a> page.
      </p>

      <h2>12. Client Portal recipients</h2>
      <p>
        If you receive a Client Proof-of-Work Portal link, we only process what&apos;s necessary to serve that
        one report: the report content itself and, if you view it, basic access logs (timestamp, so the workspace
        owner can see whether it&apos;s been viewed). Portal links are revocable by the workspace owner at any
        time and expire automatically.
      </p>

      <h2>13. Changes to this policy</h2>
      <p>
        If we make a material change, we&apos;ll update the effective date above and, for workspace users, note it
        in-app. We won&apos;t narrow your rights under this policy retroactively without asking first.
      </p>

      <h2>14. Contact</h2>
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
