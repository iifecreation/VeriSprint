import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/security", label: "Security & Trust" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Help Center" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/dpa", label: "Data Processing Agreement" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)] tracking-tight">
              <img src="/verisprint-color-logo.svg" alt="VeriSprint Logo" className="h-8 w-8" />
              VeriSprint
            </Link>
            <p className="mt-4 max-w-xs text-sm text-[var(--text-dim)] leading-relaxed">
              What actually shipped — backed by commits, not status updates.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider font-monor text-[var(--text-dim)]">{col.title}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[var(--text-dim)] transition-colors hover:text-[var(--foreground)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-[var(--line)] pt-8 text-sm text-[var(--text-dim)] sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} VeriSprint. All rights reserved.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-[var(--foreground)]">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
