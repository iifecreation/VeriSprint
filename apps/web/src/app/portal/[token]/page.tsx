"use client";

import { use, useEffect, useState } from "react";
import { api, type PublicPortalReport } from "@/lib/api";

/**
 * Client Proof-of-Work Portal (spec Section 5.2) — public, unauthenticated,
 * white-labeled. No login sharing needed, no raw code shown. Deliberately
 * NOT styled with VeriSprint's own brand accent (neon-lime) — this page
 * wears the agency's own branding (logo, primary_color_hex), which is the
 * whole point of white-labeling it.
 */
export default function PublicPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [report, setReport] = useState<PublicPortalReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPublicPortalReport(token)
      .then(setReport)
      .catch(() => setError("This link is invalid or has expired."));
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center text-[var(--text-dim)]">
        <p>{error}</p>
      </div>
    );
  }

  if (!report) {
    return <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-6 text-center text-[var(--text-dim)]">Loading…</div>;
  }

  const accent = report.branding.primary_color_hex;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-6 py-5" style={{ borderTopColor: accent, borderTopWidth: 4 }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {report.branding.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.branding.logo_url} alt={report.branding.name} className="h-8 w-8 rounded-lg object-cover" />
          )}
          <span className="font-bold text-[var(--foreground)]">{report.branding.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-14">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{report.title}</h1>
          {report.period_start && report.period_end && (
            <p className="mt-1.5 text-sm text-[var(--text-dim)]">
              {new Date(report.period_start).toLocaleDateString()} – {new Date(report.period_end).toLocaleDateString()}
            </p>
          )}

          {report.status === "generating" && (
            <p className="mt-8 text-sm text-[var(--text-dim)]">This summary is still being prepared — check back shortly.</p>
          )}
          {report.status === "failed" && <p className="mt-8 text-sm text-rose-600">This summary couldn&apos;t be generated. Contact your agency contact.</p>}
          {report.status === "ready" && (
            <p className="mt-8 whitespace-pre-wrap leading-relaxed text-[var(--text-muted)]">{report.summary_text}</p>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-[var(--text-dim)]">
          Verified by {report.branding.name} — proof of work, not a claim. Powered by VeriSprint.
        </p>
      </main>
    </div>
  );
}
