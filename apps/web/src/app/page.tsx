import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">
        What actually shipped — backed by commits, not status updates.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-gray-600">
        VeriSprint reads real GitHub activity, turns it into an Evidence Ledger and Confidence
        Score per ticket, and flags claimed-vs-shipped mismatches as questions — never
        accusations.
      </p>

      <div className="mt-8 flex justify-center gap-3">
        <a
          href={`${API_BASE_URL}/github/install`}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Connect a GitHub repo
        </a>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          View the dashboard
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        &quot;Connect a GitHub repo&quot; redirects to the API&apos;s GitHub App install endpoint — needs
        GITHUB_APP_ID configured server-side.
      </p>
    </div>
  );
}
