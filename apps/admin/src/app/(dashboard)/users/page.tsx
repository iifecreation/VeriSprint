"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type AdminUser } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, Badge, Input, StatCard, Select } from "@/components/ui";
import {
  Users,
  Search,
  Building2,
  Clock,
  Shield,
  UserCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export default function UsersDirectoryPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminListUsers(search || undefined)
      .then(setUsers)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load users from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [search]);

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    return true;
  });

  const adminRolesCount = users.filter((u) => u.role === "workspace_admin" || u.role === "admin" || u.role === "org_admin").length;
  const devRolesCount = users.filter((u) => u.role === "developer" || u.role === "member").length;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Cross-Tenant Users"
        description="Global directory of user identities across all customer workspaces with role assignments and activity logs."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--text-dim)]">Total: {users.length} accounts</span>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh user directory"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* Metric Counters */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total User Accounts" value={loading ? "…" : users.length} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Admin / Lead Accounts" value={loading ? "…" : adminRolesCount} accent={adminRolesCount > 0} icon={<Shield className="h-4 w-4" />} />
        <StatCard label="Engineers / Members" value={loading ? "…" : devRolesCount} icon={<UserCheck className="h-4 w-4" />} />
        <StatCard
          label="Recently Active"
          value={loading ? "…" : users.filter((u) => u.last_login_at !== null).length}
          sublabel="Logged in at least once"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
            <Input
              type="text"
              placeholder="Search by email, name, or GitHub login…"
              className="w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs"
            >
              <option value="all">All Roles</option>
              <option value="workspace_admin">Workspace Admin</option>
              <option value="manager">Manager</option>
              <option value="developer">Developer</option>
              <option value="client">Client</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[var(--text-dim)]">
            Fetching user directory from server…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-[var(--text-dim)] mb-2" />
            <p className="text-sm font-semibold text-[var(--foreground)]">No matching users found</p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--line)] bg-[var(--surface)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)]">
                <tr>
                  <th className="px-6 py-3.5 font-bold">User Identity</th>
                  <th className="px-6 py-3.5 font-bold">Role</th>
                  <th className="px-6 py-3.5 font-bold">Workspace</th>
                  <th className="px-6 py-3.5 font-bold">GitHub Login</th>
                  <th className="px-6 py-3.5 font-bold">Last Activity</th>
                  <th className="px-6 py-3.5 font-bold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--surface)]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-[var(--foreground)] block truncate">
                          {u.name || u.email || "Unnamed Member"}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--text-dim)]">{u.email || "No email"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={u.role === "workspace_admin" ? "accent" : u.role === "manager" ? "warning" : "default"}>
                        {u.role.replace("_", " ").toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {u.workspace_id ? (
                        <Link
                          href={`/workspaces/${u.workspace_id}`}
                          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--foreground)] hover:text-brand hover:underline"
                        >
                          <Building2 className="h-3.5 w-3.5 text-brand" />
                          <span>{u.workspace_name || "Workspace"}</span>
                        </Link>
                      ) : (
                        <span className="text-[var(--text-dim)] font-mono text-[11px]">Independent</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px]">
                      {u.github_login ? (
                        <span className="text-brand">@{u.github_login}</span>
                      ) : (
                        <span className="text-[var(--text-dim)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-[var(--text-dim)]">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
                        : "Never logged in"}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-[var(--text-dim)]">
                      {new Date(u.created_at).toLocaleDateString()}
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
