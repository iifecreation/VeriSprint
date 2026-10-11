"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, type CurrentAdmin, type AdminOverview, type ServerHealth } from "@/lib/api";
import { isLoggedIn, logout } from "@/lib/auth";
import { APP_URL, API_BASE_URL } from "@/lib/config";
import {
  LayoutDashboard,
  Building2,
  Users,
  AlertTriangle,
  Mail,
  Activity,
  DollarSign,
  Tag,
  Flag,
  ShieldCheck,
  LogOut,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Radio,
  RefreshCw,
  Server,
  CheckCircle2,
  Wifi,
  WifiOff,
} from "lucide-react";

export function AdminPageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-2 flex items-center gap-1.5 text-xs font-mono text-[var(--text-dim)]">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {b.href ? (
                  <Link href={b.href} className="hover:text-[var(--foreground)] transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-[var(--foreground)] font-semibold">{b.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 text-[var(--text-dim)]" />}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
        {description && <p className="mt-1 text-xs text-[var(--text-dim)]">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export function ServerConnectionAlert({
  error,
  onRetry,
}: {
  error?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-left mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
            <WifiOff className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--foreground)]">Backend Connection Issue</h4>
            <p className="mt-0.5 text-xs text-rose-300/80">
              {error || `Unable to reach the FastAPI server at ${API_BASE_URL}. Ensure the service is running.`}
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/30 transition-all shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface AdminShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function AdminShell({ children, title, description, actions }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<CurrentAdmin | null | "unauthorized">(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [serverHealth, setServerHealth] = useState<ServerHealth | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    api.me()
      .then(setMe)
      .catch(() => setMe("unauthorized"));
  }, [router]);

  const checkHealth = () => {
    api.checkServerHealth().then(setServerHealth);
  };

  const loadOverview = () => {
    api.adminOverview()
      .then(setOverview)
      .catch(() => {});
  };

  useEffect(() => {
    checkHealth();
    const hInterval = setInterval(checkHealth, 15_000);
    return () => clearInterval(hInterval);
  }, []);

  useEffect(() => {
    if (me === null || me === "unauthorized") return;
    loadOverview();
    const interval = setInterval(loadOverview, 30_000);
    return () => clearInterval(interval);
  }, [me]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    checkHealth();
    loadOverview();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (me === "unauthorized") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 mb-4 border border-rose-500/20">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Operator Access Denied</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">This console requires verified Super Admin credentials.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--accent-neon)] px-5 py-2.5 text-xs font-bold text-[#04201f]"
        >
          Sign In with Admin Account →
        </Link>
      </div>
    );
  }

  if (me === null) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm font-mono text-[var(--text-dim)]">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-neon)] border-t-transparent" />
          <span>Authenticating Operator Session…</span>
        </div>
      </div>
    );
  }

  const NAV_SECTIONS = [
    {
      title: "Operations",
      items: [
        { href: "/", label: "Overview", icon: LayoutDashboard },
        { href: "/workspaces", label: "Workspaces", icon: Building2 },
        { href: "/users", label: "Users", icon: Users },
      ],
    },
    {
      title: "Observability",
      items: [
        {
          href: "/errors",
          label: "Errors & Incidents",
          icon: AlertTriangle,
          badge: overview?.open_error_count && overview.open_error_count > 0 ? overview.open_error_count : undefined,
          badgeColor: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
        },
        { href: "/metrics", label: "System Telemetry", icon: Activity },
        {
          href: "/messages",
          label: "Contact Inquiries",
          icon: Mail,
          badge:
            overview?.open_contact_message_count && overview.open_contact_message_count > 0
              ? overview.open_contact_message_count
              : undefined,
          badgeColor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        },
      ],
    },
    {
      title: "Control Plane",
      items: [
        { href: "/revenue", label: "Revenue & MRR", icon: DollarSign },
        { href: "/pricing", label: "Pricing Catalog", icon: Tag },
        { href: "/flags", label: "Feature Flags", icon: Flag },
        { href: "/audit", label: "Compliance Audit", icon: ShieldCheck },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-[var(--line)] bg-[var(--panel-bg)]/80 backdrop-blur-xl shrink-0 fixed inset-y-0 left-0 z-30">
        {/* Header */}
        <div className="p-5 border-b border-[var(--line)]">
          <Link href="/" className="flex items-center gap-3">
            <img src="/verisprint-white-logo.svg" alt="VeriSprint Logo" className="h-8 w-8 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-[var(--foreground)]">VeriSprint</span>
                <span className="rounded-full bg-[var(--accent-neon)]/15 border border-[var(--accent-neon)]/30 px-2 py-0.2 text-[10px] font-mono font-bold uppercase text-[var(--accent-neon)]">
                  Operator
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-dim)]">Cross-Tenant Control Plane</p>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-dim)] mb-2">
                {section.title}
              </p>
              <nav className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[var(--accent-neon)] text-[#04201f] shadow-sm font-bold"
                          : "text-[var(--text-muted)] hover:bg-[var(--line)]/50 hover:text-[var(--foreground)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`h-4 w-4 ${isActive ? "text-[#04201f]" : "text-[var(--text-dim)]"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                            isActive ? "bg-[#04201f]/20 text-[#04201f]" : item.badgeColor ?? "bg-brand/20 text-brand"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Server & Operator Profile Card */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--background)]/40 space-y-3">
          <div className="flex items-center justify-between px-1 text-[11px] font-mono text-[var(--text-dim)]">
            <span className="flex items-center gap-1.5">
              <Server className="h-3 w-3" />
              <span>FastAPI Server</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  serverHealth?.ok ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              <span className={serverHealth?.ok ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {serverHealth ? (serverHealth.ok ? "Connected" : "Offline") : "Checking…"}
              </span>
            </span>
          </div>

          <div className="rounded-xl border border-[var(--line)]/60 bg-[var(--surface)]/40 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-bold text-[var(--foreground)] truncate block">{me.email}</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-dim)] block">Super Admin Session</span>
            </div>
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              title="Log Out of Operator Console"
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--background)]/85 backdrop-blur-md px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--line)] lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-dim)]">
              <span>Operator Console</span>
              {title && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-[var(--foreground)] font-semibold">{title}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Server Health Indicator Pill */}
            <div
              className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-mono transition-colors ${
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
              <span>
                {serverHealth
                  ? serverHealth.ok
                    ? "Server Live :58000"
                    : "Server Offline"
                  : "Checking Server…"}
              </span>
            </div>

            <button
              onClick={handleManualRefresh}
              title="Refresh console telemetry and server health"
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-brand hover:bg-[var(--line)]/50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-brand" : ""}`} />
            </button>

            <a
              href={APP_URL}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)]/60 px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-brand/40 transition-all"
            >
              <span>Customer App</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </header>

        {/* Server Disconnected Emergency Banner */}
        {serverHealth && !serverHealth.ok && (
          <div className="bg-rose-500/15 border-b border-rose-500/30 px-6 py-2.5 text-xs text-rose-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-rose-400 shrink-0" />
              <span>
                Cannot reach FastAPI server at <strong>{API_BASE_URL}</strong>. Check if uvicorn is running.
              </span>
            </div>
            <button
              onClick={checkHealth}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold text-[11px] text-rose-200 transition-colors shrink-0"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Mobile Slide-Out Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex">
            <div className="w-72 bg-[var(--panel-bg)] h-full p-5 flex flex-col justify-between border-r border-[var(--line)] overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <img src="/verisprint-white-logo.svg" alt="VeriSprint Logo" className="h-7 w-7" />
                    <span className="font-bold text-sm">Operator Console</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-[var(--text-dim)]">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 space-y-6">
                  {NAV_SECTIONS.map((section) => (
                    <div key={section.title}>
                      <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-dim)] mb-2">
                        {section.title}
                      </p>
                      <nav className="space-y-1">
                        {section.items.map((item) => {
                          const isActive = pathname === item.href;
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                                isActive
                                  ? "bg-[var(--accent-neon)] text-[#04201f] font-bold"
                                  : "text-[var(--text-muted)] hover:bg-[var(--line)]"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </div>
                              {item.badge !== undefined && (
                                <span className="rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold bg-brand/20 text-brand">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </nav>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--line)] space-y-3">
                <div className="flex items-center justify-between px-1 text-[11px] font-mono text-[var(--text-dim)]">
                  <span>Server Status</span>
                  <span className={serverHealth?.ok ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {serverHealth?.ok ? "Online" : "Offline"}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    router.push("/login");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-semibold text-rose-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Page Header (if title provided directly) */}
        {(title || actions) && (
          <div className="border-b border-[var(--line)] bg-[var(--surface)]/30 px-6 py-6 sm:px-8">
            <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {title && <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>}
                {description && <p className="mt-1 text-xs text-[var(--text-dim)]">{description}</p>}
              </div>
              {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
            </div>
          </div>
        )}

        {/* Child Content */}
        <main className="flex-1 p-6 sm:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
