"use client";

import { useEffect, useState } from "react";
import { api, type AdminFeatureFlag } from "@/lib/api";
import { AdminPageHeader, ServerConnectionAlert } from "@/components/AdminShell";
import { Card, Badge, Input, PrimaryButton, Select } from "@/components/ui";
import {
  Flag,
  Plus,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from "lucide-react";

export default function FeatureFlagsControlPage() {
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTier, setNewTier] = useState<string>("");
  const [newGlobal, setNewGlobal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    api.adminListFlags()
      .then(setFlags)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load feature flags from server");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim()) return;

    setCreating(true);
    try {
      await api.adminCreateFlag({
        key: newKey.trim(),
        description: newDesc.trim() || undefined,
        enabled_globally: newGlobal,
        min_plan_tier: newTier || null,
      });
      setNewKey("");
      setNewDesc("");
      setNewTier("");
      setNewGlobal(false);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create feature flag.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleGlobal(flag: AdminFeatureFlag) {
    try {
      await api.adminUpdateFlag(flag.id, {
        enabled_globally: !flag.enabled_globally,
      });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle feature flag.");
    }
  }

  async function updateMinTier(flag: AdminFeatureFlag, tier: string) {
    try {
      await api.adminUpdateFlag(flag.id, {
        min_plan_tier: tier || null,
      });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update minimum tier.");
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Feature Flags & Killswitches"
        description="Cross-tenant feature switches, beta rollouts, and runtime killswitch controls evaluated per-request."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--text-dim)]">Total: {flags.length} flags</span>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
              title="Refresh feature flags"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-brand" : ""}`} />
            </button>
          </div>
        }
      />

      {error && <ServerConnectionAlert error={error} onRetry={load} />}

      {/* Flag Creator Form */}
      <Card className="p-6">
        <h3 className="font-bold text-sm text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand" />
          <span>Provision New Feature Flag</span>
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end">
          <div className="sm:col-span-1">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
              Flag Key
            </label>
            <Input
              type="text"
              required
              placeholder="e.g. beta_mcp_chat"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
              Description
            </label>
            <Input
              type="text"
              placeholder="Controls access to..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full text-xs"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-xs font-mono uppercase tracking-wider text-[var(--text-dim)] mb-1">
              Minimum Plan Tier
            </label>
            <Select
              value={newTier}
              onChange={(e) => setNewTier(e.target.value)}
              className="w-full text-xs"
            >
              <option value="">No Minimum (Free+)</option>
              <option value="team">Team+</option>
              <option value="growth">Growth+</option>
              <option value="agency">Agency+</option>
              <option value="enterprise">Enterprise Only</option>
            </Select>
          </div>

          <div className="sm:col-span-1 flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-mono cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newGlobal}
                onChange={(e) => setNewGlobal(e.target.checked)}
                className="rounded border-[var(--line)] bg-[var(--surface)] text-brand"
              />
              <span>Enabled Globally</span>
            </label>
            <PrimaryButton type="submit" disabled={creating} className="text-xs py-2 px-4 ml-auto">
              {creating ? "Adding…" : "Add Flag"}
            </PrimaryButton>
          </div>
        </form>
      </Card>

      {/* Flag List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-[var(--text-dim)]">
            Loading feature flags from server…
          </div>
        ) : flags.length === 0 ? (
          <Card className="py-16 text-center text-xs text-[var(--text-dim)]">
            No feature flags found in database.
          </Card>
        ) : (
          flags.map((flag) => (
            <Card key={flag.id} className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-[var(--foreground)]">{flag.key}</span>
                    <Badge variant={flag.enabled_globally ? "success" : "default"}>
                      {flag.enabled_globally ? "GLOBAL" : "RESTRICTED"}
                    </Badge>
                    {flag.min_plan_tier && (
                      <Badge variant="accent">{flag.min_plan_tier.toUpperCase()}+</Badge>
                    )}
                  </div>
                  {flag.description && (
                    <p className="text-xs text-[var(--text-dim)]">{flag.description}</p>
                  )}
                  <span className="font-mono text-[10px] text-[var(--text-dim)] block">
                    Updated: {new Date(flag.updated_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <Select
                    value={flag.min_plan_tier || ""}
                    onChange={(e) => updateMinTier(flag, e.target.value)}
                    className="text-xs font-mono"
                  >
                    <option value="">Any Tier</option>
                    <option value="team">Team+</option>
                    <option value="growth">Growth+</option>
                    <option value="agency">Agency+</option>
                    <option value="enterprise">Enterprise</option>
                  </Select>

                  <button
                    onClick={() => toggleGlobal(flag)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      flag.enabled_globally
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-[var(--line)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {flag.enabled_globally ? (
                      <>
                        <ToggleRight className="h-4 w-4" />
                        <span>Enabled</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-4 w-4" />
                        <span>Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
