"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { api, type ServerHealth } from "@/lib/api";
import { APP_URL, API_BASE_URL } from "@/lib/config";
import { ExternalLink, Server, RefreshCw, WifiOff } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = () => {
    setChecking(true);
    api.checkServerHealth()
      .then(setServerHealth)
      .finally(() => setTimeout(() => setChecking(false), 500));
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#16302f] via-[var(--background)] to-[var(--background)] text-[var(--foreground)]">
      {/* Top Header */}
      <header className="mx-auto w-full max-w-7xl flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2.5">
          <img src="/verisprint-white-logo.svg" alt="VeriSprint Logo" className="h-8 w-8" />
          <span className="font-bold text-lg tracking-tight text-[var(--foreground)]">VeriSprint</span>
          <span className="rounded-full bg-[var(--accent-neon)]/15 border border-[var(--accent-neon)]/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-[var(--accent-neon)]">
            Control Plane
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Server Connection Badge */}
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono transition-colors ${
              serverHealth?.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                serverHealth?.ok ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span className="hidden sm:inline">FastAPI:</span>
            <span>{serverHealth ? (serverHealth.ok ? "Live :58000" : "Offline") : "Checking…"}</span>
            <button
              onClick={checkHealth}
              title="Re-check server connection"
              className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
            >
              <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
            </button>
          </div>

          <a
            href={APP_URL}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors"
          >
            <span>Customer App</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-md my-8">{children}</main>

      {/* Bottom Footer */}
      <footer className="mx-auto w-full max-w-7xl flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-dim)] gap-2 py-4 border-t border-[var(--line)]/40">
        <span>© {new Date().getFullYear()} VeriSprint Security Operations. All actions logged with SHA-256 integrity.</span>
        <span className="font-mono text-[11px]">Node: admin.verisprint.internal</span>
      </footer>
    </div>
  );
}
