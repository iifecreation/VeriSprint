"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";

/**
 * Hides the internal nav on the public, white-labeled Client Portal
 * (spec Section 5.2) — a client should never see VeriSprint's own
 * dashboard/settings links.
 */
export function ConditionalTopNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/portal/")) return null;
  return <TopNav />;
}
