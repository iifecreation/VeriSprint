"use client";

import { use, useEffect, useState } from "react";
import { api, type PublicPortalReport } from "@/lib/api";

/**
 * Client Proof-of-Work Portal (spec Section 5.2) — public, unauthenticated,
 * white-labeled. No login sharing needed, no raw code shown.
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
      <div className="mx-auto max-w-lg px-4 py-24 text-center text-gray-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!report) {
    return <div className="mx-auto max-w-lg px-4 py-24 text-center text-gray-400">Loading…</div>;
  }

  const accent = report.branding.primary_color_hex;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5" style={{ borderTopColor: accent, borderTopWidth: 4 }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {report.branding.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={report.branding.logo_url} alt={report.branding.name} className="h-8 w-8 rounded" />
          )}
          <span className="font-semibold text-gray-900">{report.branding.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-gray-900">{report.title}</h1>
        {report.period_start && report.period_end && (
          <p className="mt-1 text-sm text-gray-500">
            {new Date(report.period_start).toLocaleDateString()} – {new Date(report.period_end).toLocaleDateString()}
          </p>
        )}

        {report.status === "generating" && (
          <p className="mt-8 text-sm text-gray-500">This summary is still being prepared — check back shortly.</p>
        )}
        {report.status === "failed" && <p className="mt-8 text-sm text-rose-600">This summary couldn&apos;t be generated. Contact your agency contact.</p>}
        {report.status === "ready" && (
          <p className="mt-8 whitespace-pre-wrap text-gray-800 leading-relaxed">{report.summary_text}</p>
        )}

        <p className="mt-16 text-xs text-gray-400">Verified by {report.branding.name} — proof of work, not a claim.</p>
      </main>
    </div>
  );
}
