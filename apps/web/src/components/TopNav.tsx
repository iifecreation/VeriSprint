"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { decodeAccessTokenClaims, isLoggedIn, logout } from "@/lib/auth";

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
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold text-gray-900">
          VeriSprint
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
          {visibleLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-gray-900">
              {link.label}
            </Link>
          ))}
          {isSuperAdmin && (
            <Link href="/admin" className="font-medium text-gray-900 hover:text-gray-700">
              Admin
            </Link>
          )}
          {loggedIn ? (
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="hover:text-gray-900"
            >
              Log out
            </button>
          ) : (
            <Link href="/login" className="hover:text-gray-900">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
