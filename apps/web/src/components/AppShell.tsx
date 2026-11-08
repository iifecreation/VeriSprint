"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { decodeAccessTokenClaims, isLoggedIn, isPublicRoute, redirectToLogin } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TrialBanner } from "./TrialBanner";

// Routes that render their own full-page chrome and shouldn't show the
// authenticated app's nav: the public, white-labeled Client Portal (spec
// Section 5.2 — a client should never see VeriSprint's own dashboard/settings
// links), and the login/callback screens, which read better as a clean,
// centered page than as content next to a sidebar full of links a
// signed-out visitor can't use yet.
const HIDDEN_PREFIXES = ["/portal/", "/login", "/auth/callback", "/accept-invite", "/reset-password", "/forgot-password", "/subscribe"];

/** Single source of truth for "does this route show the sidebar" — decided
 * once here so the sidebar itself and <main>'s matching lg:pl-64 offset
 * (there's no sidebar to make room for on a hidden route) can never drift
 * out of sync with each other. */
// Pages only some roles can use — the API enforces this regardless; this
// just shows a clear message instead of a page full of failed requests.
const ROLE_RESTRICTED: Record<string, string[]> = {
  "/settings": ["workspace_admin", "super_admin"],
  "/audit": ["workspace_admin", "manager", "super_admin"],
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showChrome = !(pathname && HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)));
  // Signed-out visitors on a protected route go straight to /login instead
  // of seeing an empty app shell full of failed requests. Checked after
  // mount (localStorage isn't available during SSR).
  const [blocked, setBlocked] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      const needsLogin = !!pathname && !isPublicRoute(pathname) && !isLoggedIn();
      setBlocked(needsLogin);
      if (needsLogin) redirectToLogin();
      const allowed = pathname ? ROLE_RESTRICTED[pathname] : undefined;
      const role = decodeAccessTokenClaims()?.role ?? "";
      setForbidden(!needsLogin && !!allowed && !allowed.includes(role));
    });
  }, [pathname]);

  if (blocked) {
    return <div className="flex min-h-[70vh] items-center justify-center text-sm text-[var(--text-dim)]">Redirecting to sign in…</div>;
  }

  return (
    <>
      {showChrome && <Sidebar />}
      <main className={`min-w-0 ${showChrome ? "lg:pl-64" : ""}`}>
        {showChrome && <TrialBanner />}
        {/* Keyed on pathname so each route swap gets its own fade-in — a
            dashboard full of freshly-fetched data reads as "arrived", not
            "instantly teleported in", without adding a spinner or delay. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            {forbidden ? (
              <div className="mx-auto max-w-lg px-6 py-16 text-center">
                <h1 className="text-xl font-bold text-[var(--foreground)]">You don&apos;t have access to this page</h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">Ask a workspace admin if you need it.</p>
              </div>
            ) : (
              children
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
}
