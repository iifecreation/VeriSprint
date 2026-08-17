import Link from "next/link";
import { LOGIN_URL } from "@/lib/config";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/docs", label: "Docs" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900 tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-neon)] text-slate-900" aria-hidden>
             <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
          </span>
          VeriSprint
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900 transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <a href={LOGIN_URL} className="hidden text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors sm:block">
            Sign in
          </a>
          <Link
            href="/pricing"
            className="rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-slate-900 transition-all hover:opacity-90 hover:scale-105 shadow-sm"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
