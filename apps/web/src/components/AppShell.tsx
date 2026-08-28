"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
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
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showChrome = !(pathname && HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix)));

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
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
}
