"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { LOGIN_URL } from "@/lib/config";
import { PRODUCTS } from "@/lib/products";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/security", label: "Security" },
  { href: "/docs", label: "Help Center" },
  { href: "/contact", label: "Contact" },
];

/** Pure-CSS hover dropdown (desktop only, >= md) — `/features` is still a
 * real, directly-linkable page (the "Platform Overview" row here, and what
 * the trigger itself points to), the six rows below it are each their own
 * page (/platform/[slug], see src/lib/products.ts). */
function PlatformDropdown() {
  return (
    <div className="group relative">
      <Link
        href="/platform"
        className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors"
      >
        Platform
        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" strokeWidth={2.5} />
      </Link>
      <div className="invisible absolute left-1/2 top-full z-50 w-72 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100">
        <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-lg">
          <Link
            href="/platform"
            className="block border-b border-[var(--line)] px-4 py-3 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
          >
            Platform overview
            <span className="block text-xs font-normal text-[var(--text-dim)]">All six products, one evidence source</span>
          </Link>
          {PRODUCTS.map((product) => (
            <Link
              key={product.slug}
              href={`/platform/${product.slug}`}
              className="block px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors"
            >
              {product.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Safety net alongside each link's own onClick — covers back/forward
  // navigation and any other route change the explicit handlers miss.
  // Deferred to a microtask — direct setState in an effect body triggers
  // cascading renders (react-hooks/set-state-in-effect).
  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)] tracking-tight" onClick={() => setOpen(false)}>
          <img src="/verisprint-color-logo.svg" alt="VeriSprint Logo" className="h-8 w-8" />
          VeriSprint
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[var(--text-muted)] md:flex">
          <PlatformDropdown />
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[var(--foreground)] transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href={LOGIN_URL} className="hidden text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors md:block">
            Sign in
          </a>
          <Link
            href="/pricing"
            className="hidden rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-[#04201f] transition-all hover:opacity-90 hover:scale-105 shadow-sm sm:block"
          >
            Start free
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface)] md:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--line)] bg-[var(--background)] md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4 text-sm font-semibold text-[var(--text-muted)]">
            <p className="px-2 pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">Platform</p>
            <Link href="/platform" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
              Platform overview
            </Link>
            {PRODUCTS.map((product) => (
              <Link
                key={product.slug}
                href={`/platform/${product.slug}`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2 pl-5 hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                {product.name}
              </Link>
            ))}

            <div className="my-2 border-t border-[var(--line)]" />

            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2 hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
                {link.label}
              </Link>
            ))}

            <div className="my-2 border-t border-[var(--line)]" />

            <a href={LOGIN_URL} className="rounded-lg px-2 py-2 hover:bg-[var(--surface)] hover:text-[var(--foreground)]">
              Sign in
            </a>
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-brand px-6 py-2.5 text-center text-sm font-bold text-[#04201f] transition-all hover:opacity-90"
            >
              Start free
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
