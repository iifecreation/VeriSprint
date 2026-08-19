"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

// Routes that render their own full-page chrome and shouldn't show the
// authenticated app's nav: the public, white-labeled Client Portal (spec
// Section 5.2 — a client should never see VeriSprint's own dashboard/settings
// links), and the login/callback screens, which read better as a clean,
// centered page than as content next to a sidebar full of links a
// signed-out visitor can't use yet.
const HIDDEN_PREFIXES = ["/portal/", "/login", "/auth/callback", "/accept-invite", "/reset-password", "/forgot-password"];

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
      <main className={`min-w-0 ${showChrome ? "lg:pl-64" : ""}`}>{children}</main>
    </>
  );
}
