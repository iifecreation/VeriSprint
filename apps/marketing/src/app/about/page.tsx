import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/ui";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = { title: "About — VeriSprint" };

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="Why VeriSprint exists" />
      <Section>
        <div className="mx-auto max-w-2xl text-base leading-relaxed text-slate-700">
          <p>
            Status meetings ask engineers to reconstruct, from memory, what they did — and ask managers to take that
            reconstruction on faith. Meanwhile the actual record of what happened already exists: it&apos;s sitting in
            git. VeriSprint reads that record instead of asking anyone to summarize it twice.
          </p>
          <p className="mt-4">
            We&apos;re early — a small, independent project rather than a large company, and still adding the Phase 2
            and Phase 3 features on our own roadmap. What&apos;s described on this site reflects what&apos;s actually
            built and running today, not what we plan to build. If a page here ever claims a capability that doesn&apos;t
            work as described, we&apos;d genuinely like to hear about it.
          </p>
          <p className="mt-4">
            Get in touch at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-indigo-600 hover:text-indigo-700">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
