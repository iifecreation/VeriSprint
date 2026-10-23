import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-mono text-sm text-[var(--text-dim)]">404</p>
      <h1 className="mt-2 text-3xl font-bold text-[var(--foreground)]">We couldn&apos;t find that page</h1>
      <p className="mt-3 text-[var(--text-muted)]">The link may be out of date, or the page may have moved.</p>
      <div className="mt-8 flex items-center justify-center gap-4">
        <Link href="/" className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-[#04201f] hover:opacity-90">
          Back to home
        </Link>
        <Link href="/contact" className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)]">
          Contact us
        </Link>
      </div>
    </div>
  );
}
