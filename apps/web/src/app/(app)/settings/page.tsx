"use client";

import { useEffect, useState } from "react";
import {
  api,
  type CurrentUser,
  type Integration,
  type MCPConfig,
  type PricingPlan,
  type Repo,
  type Service,
  type Subscription,
  type Team,
  type WorkspaceSSOConfig,
  type WorkspaceSettings,
} from "@/lib/api";
import { useAccessTokenClaims } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { Badge, Card, Input, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";

const KNOWN_PROVIDERS = ["linear", "jira", "pagerduty", "datadog", "opsgenie"] as const;
const INVITABLE_ROLES = ["manager", "developer", "workspace_admin"] as const;
const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  workspace_admin: "Workspace Admin",
  manager: "Manager",
  developer: "Developer",
  client: "Client",
};

/** Workspace settings: white-label branding + ROI calculator inputs. */
export default function SettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const workspaceId = useAccessTokenClaims()?.workspace_id ?? null;

  useEffect(() => {
    if (workspaceId) api.getSettings(workspaceId).then(setSettings);
  }, [workspaceId]);

  async function handleSave() {
    if (!settings || !workspaceId) return;
    const updated = await api.updateSettings(workspaceId, {
      name: settings.name,
      logo_url: settings.logo_url,
      primary_color_hex: settings.primary_color_hex,
      avg_standup_minutes: settings.avg_standup_minutes,
      hourly_rate_usd: settings.hourly_rate_usd,
    });
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!workspaceId) return <div className="mx-auto max-w-lg px-6 py-16 text-sm text-[var(--text-dim)]">Sign in to a workspace to manage settings.</div>;
  if (!settings) return <div className="mx-auto max-w-lg px-6 py-16 text-sm text-[var(--text-dim)]">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <PageHeader title="Settings" subtitle="White-label branding for the Client Portal, plus the inputs the ROI calculator uses." />

      <Card className="mt-8 space-y-5">
        <Field label="Workspace / agency name (Client Portal branding)">
          <Input className="w-full" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
        </Field>
        <Field label="Logo URL">
          <Input className="w-full" value={settings.logo_url ?? ""} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value || null })} />
        </Field>
        <Field label="Primary color">
          <input
            type="color"
            className="h-10 w-16 rounded-lg border border-[var(--line-strong)]"
            value={settings.primary_color_hex}
            onChange={(e) => setSettings({ ...settings, primary_color_hex: e.target.value })}
          />
        </Field>
        <Field label="Average standup length (minutes) — used by the ROI calculator">
          <Input type="number" className="w-24" value={settings.avg_standup_minutes} onChange={(e) => setSettings({ ...settings, avg_standup_minutes: Number(e.target.value) })} />
        </Field>
        <Field label="Hourly rate (USD) — leave blank to keep dollar figures hidden everywhere">
          <Input
            type="number"
            className="w-32"
            value={settings.hourly_rate_usd ?? ""}
            onChange={(e) => setSettings({ ...settings, hourly_rate_usd: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>

        <div className="flex items-center gap-3 pt-2">
          <PrimaryButton onClick={handleSave}>Save</PrimaryButton>
          {saved && <span className="text-sm font-medium text-emerald-600">Saved.</span>}
        </div>
      </Card>

      <BillingSection />
      <TeamSection />
      <SegmentationSection />
      <IntegrationsSection workspaceId={workspaceId} />
      <SSOConfigSection />
      <MCPConfigSection />
    </div>
  );
}

const TIER_LABEL: Record<string, string> = { free: "Free", team: "Team", growth: "Growth", agency: "Agency", enterprise: "Enterprise" };

function BillingSection() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [provider, setProvider] = useState<"stripe" | "paystack">("stripe");
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.getSubscription().then(setSub);
    api.listPricingPlans().then(setPlans);
  }
  useEffect(load, []);

  async function subscribe(tier: string) {
    setError(null);
    setBusyTier(tier);
    try {
      const { checkout_url } = await api.createCheckout({
        plan_tier: tier,
        provider,
        success_url: `${window.location.origin}/settings`,
        cancel_url: `${window.location.origin}/settings`,
      });
      window.location.href = checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start checkout — try again in a moment.");
    } finally {
      setBusyTier(null);
    }
  }

  async function openPortal() {
    setError(null);
    try {
      const { portal_url } = await api.createBillingPortal(`${window.location.origin}/settings`);
      window.location.href = portal_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the billing portal.");
    }
  }

  if (!sub) return null;

  return (
    <Card className="mt-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[var(--foreground)]">Plan &amp; Billing</h2>
          <p className="mt-1 text-xs text-[var(--text-dim)]">
            Current plan: <strong className="text-[var(--text-muted)]">{TIER_LABEL[sub.plan_tier] ?? sub.plan_tier}</strong>
            {sub.status !== "trialing" && <> · {sub.status}</>}
            {sub.mrr > 0 && <> · ${sub.mrr.toLocaleString()}/mo</>}
          </p>
        </div>
        {sub.plan_tier !== "free" && sub.payment_provider === "stripe" && (
          <SecondaryButton onClick={openPortal}>Manage billing</SecondaryButton>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-[var(--text-dim)]">Pay with</p>
        <div className="mt-1.5 flex gap-2">
          <button
            onClick={() => setProvider("stripe")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${provider === "stripe" ? "border-brand bg-brand/10 text-brand" : "border-[var(--line-strong)] text-[var(--text-dim)]"}`}
          >
            Card (Stripe)
          </button>
          <button
            onClick={() => setProvider("paystack")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${provider === "paystack" ? "border-brand bg-brand/10 text-brand" : "border-[var(--line-strong)] text-[var(--text-dim)]"}`}
          >
            Paystack
          </button>
        </div>
        <p className="mt-1 text-xs text-[var(--text-dim)]">Paystack is for workspaces billed in a country Stripe doesn&apos;t support payouts to.</p>
      </div>

      {plans.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((p) => (
            <div key={p.tier} className={`rounded-xl border p-4 ${sub.plan_tier === p.tier ? "border-brand bg-brand/5" : "border-[var(--line)]"}`}>
              <p className="font-semibold text-[var(--foreground)]">{p.name}</p>
              <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                ${p.price_usd}
                <span className="text-xs font-normal text-[var(--text-dim)]">/{p.billing_interval}</span>
              </p>
              {sub.plan_tier === p.tier ? (
                <Badge tone="brand">Current plan</Badge>
              ) : (
                <SecondaryButton className="mt-3 w-full" onClick={() => subscribe(p.tier)} disabled={busyTier === p.tier}>
                  {busyTier === p.tier ? "Redirecting…" : "Subscribe"}
                </SecondaryButton>
              )}
            </div>
          ))}
        </div>
      )}
      {plans.length === 0 && <p className="text-xs text-[var(--text-dim)]">No self-serve plans configured yet.</p>}
      {error && <p className="rounded-lg bg-rose-500/15 p-3 text-xs text-rose-400">{error}</p>}
    </Card>
  );
}

function TeamSection() {
  const currentUserId = useAccessTokenClaims()?.sub ?? null;
  const [members, setMembers] = useState<CurrentUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>("developer");
  const [status, setStatus] = useState<"idle" | "inviting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<string | null>(null);

  async function refresh() {
    setMembers(await api.listWorkspaceUsers());
    setLoaded(true);
  }

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      refresh();
    });
  }, []);

  async function handleInvite() {
    if (!email.trim()) return;
    setStatus("inviting");
    setError(null);
    try {
      await api.inviteUser(email.trim(), role, name.trim() || undefined);
      setInvited(email.trim());
      setEmail("");
      setName("");
      await refresh();
      setStatus("idle");
    } catch {
      setError("Couldn't send that invite — check the email address, or that email sending is configured (RESEND_API_KEY).");
      setStatus("error");
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    await api.changeUserRole(userId, newRole);
    await refresh();
  }

  async function handleRemove(userId: string) {
    await api.removeUser(userId);
    await refresh();
  }

  return (
    <Card className="mt-8 space-y-5">
      <div>
        <h2 className="font-semibold text-[var(--foreground)]">Team</h2>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          Invite teammates by email — they get a one-time link to set a password and join this workspace. GitHub
          OAuth remains available as the primary sign-in path for anyone in your GitHub org.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Email</label>
          <Input className="mt-1.5 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Name (optional)</label>
          <Input className="mt-1.5 w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Role</label>
          <select
            className="mt-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof INVITABLE_ROLES)[number])}
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>
        <PrimaryButton onClick={handleInvite} disabled={!email.trim() || status === "inviting"}>
          {status === "inviting" ? "Sending…" : "Send invite"}
        </PrimaryButton>
      </div>

      {invited && <p className="text-sm font-medium text-emerald-600">Invite sent to {invited}.</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="space-y-2 border-t border-[var(--line)] pt-4">
        {!loaded && <p className="text-sm text-[var(--text-dim)]">Loading…</p>}
        {loaded && members.length === 0 && <p className="text-sm text-[var(--text-dim)]">No teammates yet — invite one above.</p>}
        {members.map((m) => {
          const isSelf = m.id === currentUserId;
          return (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--background)] px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--foreground)]">{m.name || m.email || m.github_login || "Unnamed"}</p>
                <p className="truncate text-xs text-[var(--text-dim)]">{m.email ?? m.github_login}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isSelf ? (
                  <Badge tone="brand">{ROLE_LABEL[m.role] ?? m.role} (you)</Badge>
                ) : (
                  <>
                    <select
                      className="rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]"
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    >
                      {INVITABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                    <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handleRemove(m.id)}>Remove</SecondaryButton>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SegmentationSection() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teamLogins, setTeamLogins] = useState("");
  const [serviceName, setServiceName] = useState("");

  async function refresh() {
    const [t, s, r] = await Promise.all([api.listTeams(), api.listServices(), api.listRepos()]);
    setTeams(t);
    setServices(s);
    setRepos(r);
  }

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      refresh();
    });
  }, []);

  async function handleCreateTeam() {
    if (!teamName.trim()) return;
    const logins = teamLogins.split(",").map((l) => l.trim()).filter(Boolean);
    await api.createTeam(teamName.trim(), logins);
    setTeamName("");
    setTeamLogins("");
    await refresh();
  }

  async function handleCreateService() {
    if (!serviceName.trim()) return;
    await api.createService(serviceName.trim());
    setServiceName("");
    await refresh();
  }

  async function handleAssignService(repoId: string, serviceId: string) {
    await api.updateRepo(repoId, { service_id: serviceId || null });
    await refresh();
  }

  return (
    <Card className="mt-8 space-y-6">
      <div>
        <h2 className="font-semibold text-[var(--foreground)]">Segmentation (Teams &amp; Services)</h2>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          Teams group GitHub logins (filter Git Efficiency Metrics by team instead of one person); Services group
          repos (scope dashboards by a named multi-repo service instead of one repo).
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-muted)]">Teams</h3>
        <div className="mt-2 space-y-2">
          {teams.length === 0 && <p className="text-sm text-[var(--text-dim)]">No teams yet.</p>}
          {teams.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl bg-[var(--background)] px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-[var(--text-muted)]">{t.name}</span>
                <span className="ml-2 text-xs text-[var(--text-dim)]">{t.member_github_logins.join(", ") || "no members"}</span>
              </div>
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => api.deleteTeam(t.id).then(refresh)}>
                Delete
              </SecondaryButton>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)]">Team name</label>
            <Input className="mt-1.5" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Platform Team" />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="block text-xs font-semibold text-[var(--text-dim)]">GitHub logins (comma-separated)</label>
            <Input className="mt-1.5 w-full" value={teamLogins} onChange={(e) => setTeamLogins(e.target.value)} placeholder="alice, bob" />
          </div>
          <PrimaryButton onClick={handleCreateTeam}>Create team</PrimaryButton>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-muted)]">Services</h3>
        <div className="mt-2 space-y-2">
          {services.length === 0 && <p className="text-sm text-[var(--text-dim)]">No services yet.</p>}
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl bg-[var(--background)] px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-[var(--text-muted)]">{s.name}</span>
                <span className="ml-2 text-xs text-[var(--text-dim)]">{s.repo_ids.length} repo(s)</span>
              </div>
              <SecondaryButton className="px-3 py-1 text-xs" onClick={() => api.deleteService(s.id).then(refresh)}>
                Delete
              </SecondaryButton>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)]">Service name</label>
            <Input className="mt-1.5" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Checkout Service" />
          </div>
          <PrimaryButton onClick={handleCreateService}>Create service</PrimaryButton>
        </div>

        {services.length > 0 && repos.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-[var(--text-dim)]">Assign repos to a service</p>
            <div className="mt-2 space-y-1.5">
              {repos.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[var(--text-muted)]">{r.full_name}</span>
                  <select
                    className="rounded-md border border-[var(--surface-raised)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]"
                    value={r.service_id ?? ""}
                    onChange={(e) => handleAssignService(r.id, e.target.value)}
                  >
                    <option value="">Ungrouped</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function IntegrationsSection({ workspaceId }: { workspaceId: string }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<(typeof KNOWN_PROVIDERS)[number]>("linear");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    api.resolvedFeatureFlags(["open_integration_framework"]).then((r) => setEnabled(r.flags.open_integration_framework ?? false));
  }, []);

  async function refresh() {
    setIntegrations(await api.listIntegrations(workspaceId));
  }

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      if (enabled) refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  async function handleConnect() {
    await api.connectIntegration(provider, apiKey ? { api_key: apiKey } : {});
    setApiKey("");
    await refresh();
  }

  async function handleDisconnect(id: string) {
    await api.disconnectIntegration(id);
    await refresh();
  }

  if (enabled === false) return null;

  return (
    <Card className="mt-8 space-y-5">
      <div>
        <h2 className="font-semibold text-[var(--foreground)]">Integrations</h2>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          Scaffolding for integrations beyond GitHub/Slack — connecting one stores its config for a future job to act on; it doesn&apos;t
          perform a live OAuth handshake.
        </p>
      </div>

      {enabled === null ? (
        <p className="text-sm text-[var(--text-dim)]">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-dim)]">Provider</label>
              <select
                className="mt-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                value={provider}
                onChange={(e) => setProvider(e.target.value as (typeof KNOWN_PROVIDERS)[number])}
              >
                {KNOWN_PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-dim)]">API key (optional)</label>
              <Input className="mt-1.5" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••" />
            </div>
            <PrimaryButton onClick={handleConnect}>Connect</PrimaryButton>
          </div>

          <div className="space-y-2">
            {integrations.length === 0 && <p className="text-sm text-[var(--text-dim)]">No integrations connected yet.</p>}
            {integrations.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl bg-[var(--background)] px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-muted)]">{i.provider}</span>
                  <Badge tone={i.status === "connected" ? "success" : "default"}>{i.status}</Badge>
                </div>
                {i.status === "connected" && (
                  <SecondaryButton className="px-3 py-1 text-xs" onClick={() => handleDisconnect(i.id)}>Disconnect</SecondaryButton>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function SSOConfigSection() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [config, setConfig] = useState<WorkspaceSSOConfig | null>(null);
  const [issuer, setIssuer] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scimToken, setScimToken] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.resolvedFeatureFlags(["workspace_sso"]).then((r) => setEnabled(r.flags.workspace_sso ?? false));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    api.getSSOConfig().then((c) => {
      setConfig(c);
      if (c) {
        setIssuer(c.issuer);
        setClientId(c.client_id);
      }
    });
  }, [enabled]);

  async function handleSave() {
    const updated = await api.upsertSSOConfig({ issuer, client_id: clientId, client_secret: clientSecret, enabled: config?.enabled ?? true });
    setConfig(updated);
    setClientSecret("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleRotateToken() {
    const { scim_token } = await api.rotateSCIMToken();
    setScimToken(scim_token);
    const refreshed = await api.getSSOConfig();
    setConfig(refreshed);
  }

  if (enabled === false) return null;

  return (
    <Card className="mt-8 space-y-5">
      <div>
        <h2 className="font-semibold text-[var(--foreground)]">SSO &amp; SCIM</h2>
        <p className="mt-1 text-xs text-[var(--text-dim)]">Per-workspace OIDC configuration. Secrets are never returned once stored — only rotatable.</p>
      </div>

      {enabled === null ? (
        <p className="text-sm text-[var(--text-dim)]">Loading…</p>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-dim)]">Issuer URL</label>
              <Input className="mt-1.5 w-full" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="https://your-idp.example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-dim)]">Client ID</label>
              <Input className="mt-1.5 w-full" value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-dim)]">Client secret {config && "(leave blank to keep current)"}</label>
              <Input type="password" className="mt-1.5 w-full" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <PrimaryButton onClick={handleSave} disabled={!issuer.trim() || !clientId.trim() || (!config && !clientSecret.trim())}>Save</PrimaryButton>
              {saved && <span className="text-sm font-medium text-emerald-600">Saved.</span>}
            </div>
          </div>

          {config && (
            <div className="border-t border-[var(--line)] pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)]">SCIM provisioning token</p>
                  <p className="text-xs text-[var(--text-dim)]">{config.has_scim_token ? "A token has been generated." : "No token generated yet."}</p>
                </div>
                <SecondaryButton onClick={handleRotateToken}>{config.has_scim_token ? "Rotate token" : "Generate token"}</SecondaryButton>
              </div>
              {scimToken && (
                <p className="mt-2 rounded-lg bg-amber-500/15 p-3 font-mono text-xs text-amber-400">
                  {scimToken} — shown once, copy it now.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function MCPConfigSection() {
  const [config, setConfig] = useState<MCPConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    api.getMCPConfig().then(setConfig);
  }, []);

  async function handleRotateToken() {
    setRotating(true);
    try {
      const { mcp_token } = await api.rotateMCPToken();
      setToken(mcp_token);
      setConfig(await api.getMCPConfig());
    } finally {
      setRotating(false);
    }
  }

  return (
    <Card className="mt-8 space-y-5">
      <div>
        <h2 className="font-semibold text-[var(--foreground)]">MCP Server</h2>
        <p className="mt-1 text-xs text-[var(--text-dim)]">
          Connect Claude Desktop, Cursor, or any MCP-compatible client to your Evidence Ledger — query tickets,
          Confidence Scores, and Repo Chat directly from your AI tool. The token is never shown again after rotation.
        </p>
      </div>

      {config === null ? (
        <p className="text-sm text-[var(--text-dim)]">Loading…</p>
      ) : (
        <>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)]">Server URL</label>
            <Input readOnly className="mt-1.5 w-full font-mono text-xs" value={`${API_BASE_URL}/mcp/mcp`} />
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-muted)]">Workspace token</p>
                <p className="text-xs text-[var(--text-dim)]">{config.has_token ? "A token has been generated." : "No token generated yet."}</p>
              </div>
              <SecondaryButton onClick={handleRotateToken} disabled={rotating}>
                {rotating ? "Rotating…" : config.has_token ? "Rotate token" : "Generate token"}
              </SecondaryButton>
            </div>
            {token && (
              <p className="mt-2 rounded-lg bg-amber-500/15 p-3 font-mono text-xs text-amber-400 break-all">
                {token} — shown once, copy it now. Pass it as the <code>workspace_token</code> argument on every tool
                call.
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-dim)]">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
