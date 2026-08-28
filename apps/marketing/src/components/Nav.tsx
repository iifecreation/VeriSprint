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
        <div className="flex items-center gap-4">
          <a href={LOGIN_URL} className="hidden text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors sm:block">
            Sign in
          </a>
          <Link
            href="/pricing"
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-[#04201f] transition-all hover:opacity-90 hover:scale-105 shadow-sm"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
