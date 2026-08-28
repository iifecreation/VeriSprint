"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { decodeAccessTokenClaims, isLoggedIn, logout } from "@/lib/auth";
import { ADMIN_APP_URL } from "@/lib/config";

type NavLink = { href: string; label: string; roles?: string[] };
type NavGroup = { label: string; links: NavLink[] };

// `roles: undefined` means "any logged-in internal role" (everything except
// the read-only Client Portal role, which shouldn't be browsing this app at
// all). Settings/Audit Log carry real billing/compliance data, so they're
// restricted here too — the backend enforces this regardless; hiding the
// link is just so a Developer isn't clicking into a 403. Grouped instead of
// one flat list of 15 links — a single nav that long stops reading as
// navigation and starts reading as noise.
const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dev", label: "Developer View" },
    ],
  },
  {
    label: "Work",
    links: [
      { href: "/chat", label: "Repo Chat" },
      { href: "/standup", label: "Standups" },
      { href: "/sprints", label: "Sprints" },
    ],
  },
  {
    label: "Intelligence",
    links: [
      { href: "/insights", label: "Insights" },
      { href: "/analytics", label: "Analytics" },
      { href: "/multi-repo", label: "Multi-Repo" },
      { href: "/reviewers", label: "Reviewers" },
      { href: "/team", label: "Team" },
    ],
  },
  {
    label: "Reports",
    links: [
      { href: "/reports", label: "Reports" },
      { href: "/orphan-commits", label: "Orphan Commits" },
      { href: "/accuracy", label: "Accuracy" },
      { href: "/roi", label: "ROI" },
    ],
  },
  {
    label: "Admin",
    links: [
      { href: "/audit", label: "Audit Log", roles: ["workspace_admin", "manager"] },
      { href: "/settings", label: "Settings", roles: ["workspace_admin"] },
    ],
  },
];

function Logo() {
  return (
    <Link href="/dashboard" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-[var(--foreground)]">
      <img src="/verisprint-color-logo.svg" alt="VeriSprint Logo" className="h-7 w-7" />
      VeriSprint
    </Link>
  );
}

function NavContent({ visibleGroups, pathname, onNavigate }: { visibleGroups: NavGroup[]; pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)]">{group.label}</p>
          <div className="mt-1.5 space-y-0.5">
            {group.links.map((link) => {
              const active = pathname === link.href || (pathname?.startsWith(link.href + "/") ?? false);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-[var(--accent-neon)]/15 text-[var(--foreground)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  // Read client-side only (localStorage) — avoids a server/client render
  // mismatch on first paint, since the server has no way to know the token.
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Re-checked on every route change, not just on mount — the sidebar
    // lives in the shared layout and doesn't remount on client-side
    // navigation, so without this a login/logout wouldn't be reflected
    // until a full reload. Deferred to a microtask so this reads as an
    // async sync with the browser's localStorage (an external store), not
    // a synchronous render-triggering setState call.
    queueMicrotask(() => {
      setLoggedIn(isLoggedIn());
      setRole(decodeAccessTokenClaims()?.role ?? null);
      setMobileOpen(false);
    });
  }, [pathname]);

  const isSuperAdmin = role === "super_admin";
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => !link.roles || isSuperAdmin || link.roles.includes(role ?? "")),
  })).filter((group) => group.links.length > 0);

  const footer = (onNavigate?: () => void) => (
    <div className="shrink-0 border-t border-[var(--line)] p-3">
      {isSuperAdmin && (
        // External link, not an in-app route — the operator console is
        // its own separate deploy (apps/admin), not a page in this app.
        <a
          href={ADMIN_APP_URL}
          className="mb-2 flex items-center justify-center gap-1 rounded-lg border border-[var(--line-strong)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--background)]"
        >
          Operator Console ↗
        </a>
      )}
      {loggedIn ? (
        <button
          onClick={async () => {
            onNavigate?.();
            await logout();
            router.push("/login");
          }}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
        >
          Log out
        </button>
      ) : (
        <Link
          href="/login"
          onClick={onNavigate}
          className="block rounded-full bg-[var(--accent-neon)] px-4 py-2 text-center text-sm font-bold text-[#04201f] transition-all hover:bg-[var(--accent-neon-hover)]"
        >
          Sign in
        </Link>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: persistent sidebar. `lg:fixed` takes it out of normal
          document flow entirely — simpler and more robust than a flex-row
          body, which would force the mobile-only header below into a row
          layout alongside <main> instead of stacking above it. <main> gets
          a matching lg:pl-64 in layout.tsx to make room. */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-[var(--line)] lg:bg-[var(--surface)]">
        <div className="shrink-0 px-4 py-5">
          <Logo />
        </div>
        <NavContent visibleGroups={visibleGroups} pathname={pathname} />
        {footer()}
      </aside>

      {/* Mobile: slim top bar + off-canvas drawer */}
      <header className="glass-nav sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[var(--background)]/70" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[var(--surface)] shadow-xl">
            <div className="flex shrink-0 items-center justify-between px-4 py-5">
              <Logo />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NavContent visibleGroups={visibleGroups} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            {footer(() => setMobileOpen(false))}
          </div>
        </div>
      )}
    </>
  );
}
