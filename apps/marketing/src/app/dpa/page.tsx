import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Data Processing Agreement — VeriSprint",
  description: "Terms governing VeriSprint's processing of personal data on behalf of a customer workspace — roles, subprocessors, security measures, breach notification, and audit rights.",
};

export default function DPAPage() {
  return (
    <LegalLayout eyebrow="Legal" title="Data Processing Agreement" effectiveDate="August 2026">
      <p>
        This DPA describes how VeriSprint (the &ldquo;processor&rdquo;) processes personal data on behalf of a
        workspace (the &ldquo;controller&rdquo;) in connection with the service described in our{" "}
        <a href="/terms" className="text-brand underline">Terms of Service</a>. It supplements, and doesn&apos;t
        replace, our{" "}
        <a href="/privacy" className="text-brand underline">Privacy Policy</a>. If your organization needs a
        countersigned copy for procurement, email us — see Contact below — and we&apos;ll get one to you.
      </p>

      <h2>1. Roles</h2>
      <p>
        A workspace acts as the data controller for the personal data of its own users (developers, managers,
        clients receiving a Portal link) that it submits to VeriSprint. VeriSprint acts as the processor,
        handling that data only to provide the service and only on the controller&apos;s documented instructions
        — which, in practice, means: the features you enable and the repos/tickets you connect.
      </p>

      <h2>2. Subject matter and duration</h2>
      <p>
        Processing covers the categories of data described in our{" "}
        <a href="/privacy" className="text-brand underline">Privacy Policy</a> (account data, repository data via
        the GitHub App&apos;s read-only scopes, ticket data, usage data, billing data), for the duration of the
        workspace&apos;s active subscription plus the data-retention window described there.
      </p>

      <h2>3. Nature and purpose of processing</h2>
      <p>
        Ingesting commit/PR data, running it through an LLM analysis pipeline to produce Evidence Items and
        Confidence Scores, reconciling it against ticket/standup data, and generating the reports, digests, and
        dashboards described on our{" "}
        <a href="/features" className="text-brand underline">Features</a> page.
      </p>

      <h2>4. Categories of data subjects and data</h2>
      <p>
        <strong>Data subjects:</strong> the controller&apos;s own personnel with a VeriSprint account (developers,
        managers, workspace admins) and, where a Client Portal link is issued, external recipients of that link.
      </p>
      <p>
        <strong>Data categories:</strong> name, email, GitHub identity, role; commit authorship and diff content
        for connected repositories; ticket metadata; usage/audit logs; billing contact details. No special
        categories of data (health, biometric, etc.) are processed by design — the service has no field for them.
      </p>

      <h2>5. Controller obligations</h2>
      <p>
        The controller warrants that it has the right to submit the data it connects (e.g. genuine authorization
        to grant repo access and to enter its personnel&apos;s account data), and is responsible for the
        lawfulness of its own instructions to us, including which features and integrations it enables.
      </p>

      <h2>6. Processor obligations</h2>
      <p>
        We process data only on the controller&apos;s documented instructions (Section 1), ensure our own
        personnel with access to customer data are bound by confidentiality obligations, and implement the
        technical and organizational measures described in Section 8. We&apos;ll notify the controller before
        engaging a new subprocessor beyond those in Section 7, per that section&apos;s notice commitment.
      </p>

      <h2>7. Subprocessors</h2>
      <p>The current subprocessor list, matching Section 5 of the Privacy Policy:</p>
      <ul>
        <li><strong>GitHub</strong> — repository data source (OAuth + GitHub App).</li>
        <li><strong>Anthropic</strong> — LLM analysis of diffs/commits (default provider; a workspace may substitute a self-hosted LLM instead, removing this subprocessor entirely for that workspace).</li>
        <li><strong>Stripe</strong> — payment processing for paid workspaces.</li>
        <li><strong>Resend</strong> — transactional and digest email delivery.</li>
        <li><strong>Amazon Web Services (S3)</strong> — encrypted storage of raw commit diffs.</li>
        <li><strong>Sentry</strong> — error tracking, only where a workspace deployment has it configured.</li>
        <li><strong>Slack</strong> — only for workspaces that connect it.</li>
      </ul>
      <p>
        We remain liable for our subprocessors&apos; performance of their data protection obligations to the same
        extent we&apos;re liable for our own. We&apos;ll update this list if a subprocessor changes, and will make
        a reasonable effort to notify active Enterprise workspaces of any new subprocessor before it goes into use
        for their data — giving a reasonable window to object on legitimate grounds.
      </p>

      <h2>8. Security measures</h2>
      <p>
        Read-only GitHub scopes, server-enforced multi-tenant isolation, role-based access control, and an
        append-only audit trail for every privileged action — see{" "}
        <a href="/security" className="text-brand underline">Security &amp; Trust</a> for the full detail. We do
        not yet hold formal certifications like SOC 2; that page states plainly what the architecture does today
        rather than claiming a certification we don&apos;t have.
      </p>

      <h2>9. Sub-processing and international transfers</h2>
      <p>
        Each subprocessor above is contracted only to process data for the specific purpose listed. If a
        subprocessor stores or processes data outside your region and that matters for your compliance posture
        (e.g. GDPR data-residency requirements), email us — see Contact — and we&apos;ll tell you exactly what
        applies to your workspace, including the on-prem/self-hosted LLM option that removes the third-party AI
        subprocessor from the picture entirely. Where a transfer requires a specific mechanism, we rely on our
        subprocessors&apos; own Standard Contractual Clauses or equivalent safeguards.
      </p>

      <h2>10. Assistance with data subject requests</h2>
      <p>
        Where a controller receives a data subject request (access, deletion, correction) that requires our
        assistance, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">{CONTACT_EMAIL}</a> and we&apos;ll
        help fulfill it within a reasonable timeframe.
      </p>

      <h2>11. Personal data breach notification</h2>
      <p>
        If we become aware of a personal data breach affecting a controller&apos;s data, we&apos;ll notify that
        controller without undue delay after becoming aware of it, with the information reasonably available at
        the time (nature of the breach, likely consequences, and measures taken or proposed), so the controller
        can meet its own notification obligations (e.g. the 72-hour window under GDPR Art. 33).
      </p>

      <h2>12. Audit rights</h2>
      <p>
        On reasonable written notice, a controller may request information reasonably necessary to demonstrate our
        compliance with this DPA. Given our size, we currently facilitate this via documentation and a direct
        conversation with the team (email us — see Contact) rather than a formal third-party audit program; that
        will scale up as the product does.
      </p>

      <h2>13. Deletion or return of data on termination</h2>
      <p>
        On termination of a workspace&apos;s subscription, we delete the personal data covered by this DPA within
        the retention window described in our Privacy Policy, except data we&apos;re required to retain for legal
        or accounting purposes. A controller may request an export of its data before termination via the
        product&apos;s own export tooling (Audit Log CSV export, report downloads) or by contacting us.
      </p>

      <h2>14. Contact</h2>
      <p>
        For a countersigned DPA, subprocessor questions, or anything else on this page:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalLayout>
  );
}
