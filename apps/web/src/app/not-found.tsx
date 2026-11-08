import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-[var(--text-dim)]">404</p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">The link may be out of date, or the page may have moved.</p>
      <Link href="/dashboard" className="mt-6 rounded-full bg-[var(--accent-neon)] px-5 py-2.5 text-sm font-bold text-[#04201f] hover:bg-[var(--accent-neon-hover)]">
        Go to dashboard
      </Link>
    </div>
  );
}
