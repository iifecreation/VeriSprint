"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminWorkspace } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, Badge, Input, GhostButton, PrimaryButton, StatCard, Select } from "@/components/ui";
import { APP_URL } from "@/lib/config";
import {
  Building2,
  Search,
  ExternalLink,
  GitBranch,
  Users,
  DollarSign,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function WorkspacesDirectoryPage() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminListWorkspaces(search || undefined)
      .then(setWorkspaces)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load workspaces from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [search]);

  async function toggleStatus(ws: AdminWorkspace) {
    const nextStatus = ws.status === "active" ? "suspended" : "active";
    try {
      await api.adminUpdateWorkspace(ws.id, { status: nextStatus });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update workspace status");
    }
  }

  async function handleImpersonate(wsId: string) {
    setImpersonatingId(wsId);
    try {
      const token = await api.adminImpersonateWorkspace(wsId);
      const fragment = `access_token=${encodeURIComponent(token.access_token)}&expires_in=${token.expires_in}`;
      window.open(`${APP_URL}/auth/callback#${fragment}`, "_blank", "noopener");
    } catch {
      alert("Cannot impersonate this workspace: no active user accounts exist to establish a session.");
    } finally {
      setImpersonatingId(null);
    }
  }

  const filteredWorkspaces = workspaces.filter((ws) => {
    if (statusFilter !== "all" && ws.status !== statusFilter) return false;
    if (planFilter !== "all" && ws.plan_tier !== planFilter) return false;
    return true;
  });

  const totalMRR = workspaces.reduce((sum, ws) => sum + (ws.mrr || 0), 0);
  const activeCount = workspaces.filter((ws) => ws.status === "active").length;
  const paidCount = workspaces.filter((ws) => ws.plan_tier !== "free").length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Tenant Workspaces"
        description="Cross-tenant administration: inspect workspaces, manage plan tiers, toggle access, and impersonate customer sessions."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--text-dim)]">Total: {workspaces.length} organizations</span>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh workspace list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Organizations" value={loading ? "…" : workspaces.length} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Active Status" value={loading ? "…" : activeCount} sublabel={`${workspaces.length - activeCount} suspended`} />
        <StatCard label="Paying Tenants" value={loading ? "…" : paidCount} sublabel="Non-free tier" accent={paidCount > 0} />
        <StatCard label="Aggregate MRR" value={loading ? "…" : `$${totalMRR.toLocaleString()}`} accent icon={<DollarSign className="h-4 w-4" />} />
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
            <Input
              type="text"
              placeholder="Search by workspace name, GitHub login, or ID…"
              className="w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="canceled">Canceled Only</option>
            </Select>

            <Select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free</option>
              <option value="team">Team</option>
              <option value="growth">Growth</option>
              <option value="agency">Agency</option>
              <option value="enterprise">Enterprise</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[var(--text-dim)]">
            Loading tenant directory from server…
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[var(--text-dim)] mb-2" />
            <p className="text-sm font-semibold text-[var(--foreground)]">No matching workspaces found</p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">Try adjusting your search terms or filter selections.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--line)] bg-[var(--surface)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="px-6 py-3.5 font-bold">Workspace</th>
                  <th className="px-6 py-3.5 font-bold">Tier</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 font-bold">Users</th>
                  <th className="px-6 py-3.5 font-bold">Repos</th>
                  <th className="px-6 py-3.5 font-bold">MRR</th>
                  <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredWorkspaces.map((ws) => (
                  <tr key={ws.id} className="hover:bg-[var(--surface)]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <Link
                          href={`/workspaces/${ws.id}`}
                          className="font-bold text-sm text-[var(--foreground)] hover:text-brand hover:underline block truncate"
                        >
                          {ws.name}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-dim)]">
                          <span>@{ws.account_login}</span>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{ws.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={ws.plan_tier === "enterprise" ? "accent" : ws.plan_tier === "growth" ? "success" : "default"}>
                        {ws.plan_tier.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            ws.status === "active"
                              ? "bg-emerald-400"
                              : ws.status === "suspended"
                              ? "bg-rose-400"
                              : "bg-neutral-500"
                          }`}
                        />
                        <span className="font-mono capitalize text-[11px]">{ws.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-[var(--text-dim)]" />
                        <span>{ws.user_count}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3.5 w-3.5 text-[var(--text-dim)]" />
                        <span>{ws.repo_count}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] font-bold text-[var(--foreground)]">
                      ${(ws.mrr || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleImpersonate(ws.id)}
                          disabled={impersonatingId === ws.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--foreground)] hover:border-brand/40 transition-all"
                          title="Generate single-use operator impersonation JWT"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>{impersonatingId === ws.id ? "Minting…" : "Impersonate"}</span>
                        </button>
                        <button
                          onClick={() => toggleStatus(ws)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            ws.status === "active"
                              ? "text-rose-400 hover:bg-rose-500/10 border border-rose-500/30"
                              : "text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30"
                          }`}
                        >
                          {ws.status === "active" ? "Suspend" : "Activate"}
                        </button>
                        <Link
                          href={`/workspaces/${ws.id}`}
                          className="rounded-lg bg-[var(--surface)] p-1 text-[var(--text-dim)] hover:text-brand transition-colors"
                        >
                          <span className="sr-only">Details</span>
                          →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
