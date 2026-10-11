"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRODUCTS } from "@/lib/products";
import {
  ShieldCheck,
  BarChart3,
  Radar,
  MessagesSquare,
  HeartHandshake,
  KeyRound,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/platform", label: "Platform Hub", icon: LayoutGrid, short: "Overview" },
  { href: "/platform/verification-engine", label: "Verification Engine", icon: ShieldCheck, short: "Verification" },
  { href: "/platform/team-intelligence", label: "Team Intelligence", icon: BarChart3, short: "Intelligence" },
  { href: "/platform/risk-automation", label: "Risk & Automation", icon: Radar, short: "Risk" },
  { href: "/platform/reporting", label: "Communication & Reporting", icon: MessagesSquare, short: "Reporting" },
  { href: "/platform/team-health", label: "Team Health", icon: HeartHandshake, short: "Health" },
  { href: "/platform/enterprise", label: "Enterprise & Compliance", icon: KeyRound, short: "Enterprise" },
];

export function PlatformSubNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface)]/80 backdrop-blur-md sticky top-[69px] z-40 transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-brand text-[#04201f] shadow-sm font-bold"
                    : "text-[var(--text-muted)] hover:bg-[var(--line)]/50 hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#04201f]" : "text-brand"}`} strokeWidth={2.2} />
                <span className="hidden md:inline">{item.label}</span>
                <span className="inline md:hidden">{item.short}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PlatformPagination({ currentSlug }: { currentSlug: string }) {
  const index = PRODUCTS.findIndex((p) => p.slug === currentSlug);
  if (index === -1) return null;

  const prev = PRODUCTS[(index - 1 + PRODUCTS.length) % PRODUCTS.length];
  const next = PRODUCTS[(index + 1) % PRODUCTS.length];

  return (
    <div className="border-t border-[var(--line)] bg-[var(--background)] py-12">
      <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link
          href={`/platform/${prev.slug}`}
          className="group flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 w-full sm:w-auto hover:border-brand/40 transition-all"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--line)]/40 text-[var(--text-dim)] group-hover:text-brand transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </div>
          <div className="text-left">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-dim)]">Previous Product</span>
            <span className="font-semibold text-sm text-[var(--foreground)] group-hover:text-brand transition-colors">{prev.name}</span>
          </div>
        </Link>

        <Link
          href="/platform"
          className="text-xs font-mono uppercase tracking-wider font-semibold text-[var(--text-dim)] hover:text-brand transition-colors px-4 py-2 rounded-lg hover:bg-[var(--surface)]"
        >
          View Platform Architecture →
        </Link>

        <Link
          href={`/platform/${next.slug}`}
          className="group flex items-center justify-end gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 w-full sm:w-auto hover:border-brand/40 transition-all text-right"
        >
          <div>
            <span className="block text-[11px] font-mono uppercase tracking-wider text-[var(--text-dim)]">Next Product</span>
            <span className="font-semibold text-sm text-[var(--foreground)] group-hover:text-brand transition-colors">{next.name}</span>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--line)]/40 text-[var(--text-dim)] group-hover:text-brand transition-colors">
            <ChevronRight className="h-5 w-5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
