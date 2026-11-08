import Link from "next/link";
import { LOGIN_URL } from "@/lib/config";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/docs", label: "Help Center" },
  { href: "/contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)] tracking-tight">
          <img src="/verisprint-color-logo.svg" alt="VeriSprint Logo" className="h-8 w-8" />
          VeriSprint
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[var(--text-muted)] md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[var(--foreground)] transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          <a href={LOGIN_URL} className="hidden text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors sm:block">
            Sign in
          </a>
          <Link
            href="/pricing"
            className="rounded-full bg-brand px-4 py-2.5 sm:px-6 text-sm font-bold text-[#04201f] transition-all hover:opacity-90 hover:scale-105 shadow-sm"
          >
            Start free
          </Link>
          {/* Phones/tablets: the links above are hidden, so offer them in a
              menu. <details> keeps this a server component with no JS. */}
          <details className="group relative md:hidden">
            <summary
              aria-label="Open menu"
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--line-strong)] text-[var(--foreground)] [&::-webkit-details-marker]:hidden"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
              </svg>
            </summary>
            <nav className="absolute right-0 mt-3 w-56 rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-2 shadow-xl">
              {LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]">
                  {link.label}
                </Link>
              ))}
              <a href={LOGIN_URL} className="mt-1 block rounded-lg border-t border-[var(--line)] px-3 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]">
                Sign in
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
