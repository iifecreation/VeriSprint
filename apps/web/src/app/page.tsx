"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

/**
 * The product app's own root is just a redirect now — apps/marketing is the
 * real public front door (features, pricing, security, etc.), and this app
 * exists for signed-in users. Avoids maintaining two different homepages
 * that both try to explain what VeriSprint is.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    queueMicrotask(() => {
      router.replace(isLoggedIn() ? "/dashboard" : "/login");
    });
  }, [router]);

  return <div className="flex min-h-[70vh] items-center justify-center text-sm text-slate-400">Redirecting…</div>;
}
