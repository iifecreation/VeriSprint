import type { ReactNode } from "react";
import { PageHeader, Section } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/config";

export function LegalLayout({
  eyebrow,
  title,
  effectiveDate,
  children,
}: {
  eyebrow: string;
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <>
      <Section variant="default" className="bg-slate-50 pb-12 pt-20 border-b border-slate-200">
        <PageHeader eyebrow={eyebrow} title={title} />
        <p className="mx-auto -mt-2 max-w-2xl text-center text-sm text-slate-500">Effective {effectiveDate}</p>
      </Section>
      <Section>
        <div className="mx-auto max-w-3xl space-y-8 text-base leading-relaxed text-slate-700 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_p]:leading-relaxed">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <strong>Early-access notice:</strong> VeriSprint is a small, independent project, not an established
            company with in-house legal counsel — see{" "}
            <a href="/about" className="underline">
              About
            </a>
            . This document is written in good faith to accurately describe what the product actually does today,
            but it is a template pending review by a real lawyer, not a substitute for one. If anything here is
            unclear or you need a signed version for procurement, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>
            .
          </div>
          {children}
        </div>
      </Section>
    </>
  );
}
