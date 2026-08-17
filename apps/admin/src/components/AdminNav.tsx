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
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-neon)] text-slate-900" aria-hidden>
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </span>
          VeriSprint
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">Operator</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <a href={APP_URL} className="hidden text-slate-400 transition-colors hover:text-white sm:block">
            ← Back to app
          </a>
          {loggedIn && (
            <>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
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
