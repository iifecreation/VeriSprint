"use client";

import { useEffect, useState } from "react";
import { api, type CurrentUser, type Integration, type WorkspaceSSOConfig, type WorkspaceSettings } from "@/lib/api";
import { useAccessTokenClaims } from "@/lib/auth";
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

  if (!workspaceId) return <div className="mx-auto max-w-lg px-6 py-16 text-sm text-slate-400">Sign in to a workspace to manage settings.</div>;
  if (!settings) return <div className="mx-auto max-w-lg px-6 py-16 text-sm text-slate-400">Loading…</div>;

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
            className="h-10 w-16 rounded-lg border border-slate-300"
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

      <TeamSection />
      <IntegrationsSection workspaceId={workspaceId} />
      <SSOConfigSection />
    </div>
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
        <h2 className="font-semibold text-slate-900">Team</h2>
        <p className="mt-1 text-xs text-slate-500">
          Invite teammates by email — they get a one-time link to set a password and join this workspace. GitHub
          OAuth remains available as the primary sign-in path for anyone in your GitHub org.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="block text-xs font-semibold text-slate-500">Email</label>
          <Input className="mt-1.5 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" />
        </div>
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-slate-500">Name (optional)</label>
          <Input className="mt-1.5 w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500">Role</label>
          <select
            className="mt-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
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

      <div className="space-y-2 border-t border-slate-200 pt-4">
        {!loaded && <p className="text-sm text-slate-400">Loading…</p>}
        {loaded && members.length === 0 && <p className="text-sm text-slate-400">No teammates yet — invite one above.</p>}
        {members.map((m) => {
          const isSelf = m.id === currentUserId;
          return (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-800">{m.name || m.email || m.github_login || "Unnamed"}</p>
                <p className="truncate text-xs text-slate-500">{m.email ?? m.github_login}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isSelf ? (
                  <Badge tone="brand">{ROLE_LABEL[m.role] ?? m.role} (you)</Badge>
                ) : (
                  <>
                    <select
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
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
        <h2 className="font-semibold text-slate-900">Integrations</h2>
        <p className="mt-1 text-xs text-slate-500">
          Scaffolding for integrations beyond GitHub/Slack — connecting one stores its config for a future job to act on; it doesn&apos;t
          perform a live OAuth handshake.
        </p>
      </div>

      {enabled === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500">Provider</label>
              <select
                className="mt-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                value={provider}
                onChange={(e) => setProvider(e.target.value as (typeof KNOWN_PROVIDERS)[number])}
              >
                {KNOWN_PROVIDERS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500">API key (optional)</label>
              <Input className="mt-1.5" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="••••••" />
            </div>
            <PrimaryButton onClick={handleConnect}>Connect</PrimaryButton>
          </div>

          <div className="space-y-2">
            {integrations.length === 0 && <p className="text-sm text-slate-400">No integrations connected yet.</p>}
            {integrations.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{i.provider}</span>
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
        <h2 className="font-semibold text-slate-900">SSO &amp; SCIM</h2>
        <p className="mt-1 text-xs text-slate-500">Per-workspace OIDC configuration. Secrets are never returned once stored — only rotatable.</p>
      </div>

      {enabled === null ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500">Issuer URL</label>
              <Input className="mt-1.5 w-full" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="https://your-idp.example.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500">Client ID</label>
              <Input className="mt-1.5 w-full" value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500">Client secret {config && "(leave blank to keep current)"}</label>
              <Input type="password" className="mt-1.5 w-full" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <PrimaryButton onClick={handleSave} disabled={!issuer.trim() || !clientId.trim() || (!config && !clientSecret.trim())}>Save</PrimaryButton>
              {saved && <span className="text-sm font-medium text-emerald-600">Saved.</span>}
            </div>
          </div>

          {config && (
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">SCIM provisioning token</p>
                  <p className="text-xs text-slate-400">{config.has_scim_token ? "A token has been generated." : "No token generated yet."}</p>
                </div>
                <SecondaryButton onClick={handleRotateToken}>{config.has_scim_token ? "Rotate token" : "Generate token"}</SecondaryButton>
              </div>
              {scimToken && (
                <p className="mt-2 rounded-lg bg-amber-50 p-3 font-mono text-xs text-amber-900">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
