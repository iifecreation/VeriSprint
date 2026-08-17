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
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Docs" },
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
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900 tracking-tight">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-neon)] text-slate-900" aria-hidden>
                 <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
              </span>
              VeriSprint
            </Link>
            <p className="mt-4 max-w-xs text-sm text-slate-400 leading-relaxed">
              What actually shipped — backed by commits, not status updates.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider font-monor text-slate-500">{col.title}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-400 transition-colors hover:text-slate-900">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} VeriSprint. All rights reserved.</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-slate-900">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
