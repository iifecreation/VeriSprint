"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isLoggedIn, logout } from "@/lib/auth";
import { APP_URL } from "@/lib/config";

export function AdminNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Deferred to a microtask — see apps/web's TopNav.tsx for why (external
    // localStorage read, not a synchronous render-triggering setState).
    queueMicrotask(() => {
      setLoggedIn(isLoggedIn());
    });
  }, [pathname]);

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[var(--foreground)]">
          <img src="/verisprint-white-logo.svg" alt="VeriSprint Logo" className="h-8 w-8" />
          VeriSprint
          <span className="rounded-full bg-[var(--accent-neon)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Operator</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <a href={APP_URL} className="hidden text-[var(--text-dim)] transition-colors hover:text-[var(--foreground)] sm:block">
            ← Back to app
          </a>
          {loggedIn && (
            <>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="rounded-full border border-[var(--line-strong)] px-4 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--accent-neon)]/10"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
