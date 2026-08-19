import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Data Processing Agreement — VeriSprint",
  description: "Terms governing VeriSprint's processing of personal data on behalf of a customer workspace, and the list of subprocessors involved.",
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

      <h2>4. Subprocessors</h2>
      <p>The current subprocessor list, matching Section 3 of the Privacy Policy:</p>
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
        We&apos;ll update this list if a subprocessor changes, and will make a reasonable effort to notify active
        Enterprise workspaces of any new subprocessor before it goes into use for their data.
      </p>

      <h2>5. Security measures</h2>
      <p>
        Read-only GitHub scopes, server-enforced multi-tenant isolation, role-based access control, and an
        append-only audit trail for every privileged action — see{" "}
        <a href="/security" className="text-brand underline">Security &amp; Trust</a> for the full detail. We do
        not yet hold formal certifications like SOC 2; that page states plainly what the architecture does today
        rather than claiming a certification we don&apos;t have.
      </p>

      <h2>6. Sub-processing and international transfers</h2>
      <p>
        Each subprocessor above is contracted only to process data for the specific purpose listed. If a
        subprocessor stores or processes data outside your region and that matters for your compliance posture
        (e.g. GDPR data-residency requirements), email us — see Contact — and we&apos;ll tell you exactly what
        applies to your workspace, including the on-prem/self-hosted LLM option that removes the third-party AI
        subprocessor from the picture entirely.
      </p>

      <h2>7. Assistance with data subject requests</h2>
      <p>
        Where a controller receives a data subject request (access, deletion, correction) that requires our
        assistance, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">{CONTACT_EMAIL}</a> and we&apos;ll
        help fulfill it within a reasonable timeframe.
      </p>

      <h2>8. Deletion on termination</h2>
      <p>
        On termination of a workspace&apos;s subscription, we delete the personal data covered by this DPA within
        the retention window described in our Privacy Policy, except data we&apos;re required to retain for legal
        or accounting purposes.
      </p>

      <h2>9. Contact</h2>
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
