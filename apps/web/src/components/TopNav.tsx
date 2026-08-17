"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { decodeAccessTokenClaims, isLoggedIn, logout } from "@/lib/auth";
import { ADMIN_APP_URL } from "@/lib/config";

// `roles: undefined` means "any logged-in internal role" (everything except
// the read-only Client Portal role, which shouldn't be browsing this app at
// all). Settings/Audit Log carry real billing/compliance data, so they're
// restricted here too — the backend enforces this regardless; hiding the
// link is just so a Developer isn't clicking into a 403.
const LINKS: { href: string; label: string; roles?: string[] }[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dev", label: "Developer View" },
  { href: "/chat", label: "Repo Chat" },
  { href: "/standup", label: "Standups" },
  { href: "/sprints", label: "Sprints" },
  { href: "/insights", label: "Insights" },
  { href: "/analytics", label: "Analytics" },
  { href: "/reviewers", label: "Reviewers" },
  { href: "/team", label: "Team" },
  { href: "/reports", label: "Reports" },
  { href: "/orphan-commits", label: "Orphan Commits" },
  { href: "/accuracy", label: "Accuracy" },
  { href: "/roi", label: "ROI" },
  { href: "/audit", label: "Audit Log", roles: ["workspace_admin", "manager"] },
  { href: "/settings", label: "Settings", roles: ["workspace_admin"] },
];

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  // Read client-side only (localStorage) — avoids a server/client render
  // mismatch on first paint, since the server has no way to know the token.
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Re-checked on every route change, not just on mount — TopNav lives in
    // the shared layout and doesn't remount on client-side navigation, so
    // without this a login/logout wouldn't be reflected until a full reload.
    // Deferred to a microtask so this reads as an async sync with the
    // browser's localStorage (an external store), not a synchronous
    // render-triggering setState call.
    queueMicrotask(() => {
      setLoggedIn(isLoggedIn());
      setRole(decodeAccessTokenClaims()?.role ?? null);
    });
  }, [pathname]);

  const isSuperAdmin = role === "super_admin";
  const visibleLinks = LINKS.filter((link) => !link.roles || isSuperAdmin || link.roles.includes(role ?? ""));

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-neon)] text-[#3f6212]" aria-hidden>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </span>
          VeriSprint
        </Link>
        <nav className="hidden flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-600 lg:flex">
          {visibleLinks.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap transition-colors hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          {isSuperAdmin && (
            // External link, not an in-app route — the operator console is
            // its own separate deploy (apps/admin), not a page in this app.
            <a
              href={ADMIN_APP_URL}
              className="hidden items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex"
            >
              Operator Console ↗
            </a>
          )}
          {loggedIn ? (
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="font-semibold text-slate-600 transition-colors hover:text-slate-900"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[var(--accent-neon)] px-4 py-2 text-sm font-bold text-slate-900 transition-all hover:bg-[var(--accent-neon-hover)] hover:scale-105"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      {/* Second row on smaller screens where the full link list can't fit inline. */}
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200/60 px-6 py-2 text-xs font-medium text-slate-500 lg:hidden">
        {visibleLinks.map((link) => (
          <Link key={link.href} href={link.href} className="whitespace-nowrap transition-colors hover:text-slate-900">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
