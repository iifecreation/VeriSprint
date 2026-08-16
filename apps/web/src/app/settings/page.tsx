"use client";

import { useEffect, useState } from "react";
import { api, type WorkspaceSettings } from "@/lib/api";
import { decodeAccessTokenClaims } from "@/lib/auth";

/** Workspace settings: white-label branding + ROI calculator inputs. */
export default function SettingsPage() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const workspaceId = decodeAccessTokenClaims()?.workspace_id ?? null;

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

  if (!workspaceId) return <div className="mx-auto max-w-lg px-4 py-8 text-sm text-gray-400">Sign in to a workspace to manage settings.</div>;
  if (!settings) return <div className="mx-auto max-w-lg px-4 py-8 text-sm text-gray-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      <div className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <Field label="Workspace / agency name (Client Portal branding)">
          <input className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
        </Field>
        <Field label="Logo URL">
          <input className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm" value={settings.logo_url ?? ""} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value || null })} />
        </Field>
        <Field label="Primary color">
          <input type="color" className="h-9 w-16 rounded border border-gray-300" value={settings.primary_color_hex} onChange={(e) => setSettings({ ...settings, primary_color_hex: e.target.value })} />
        </Field>
        <Field label="Average standup length (minutes) — used by the ROI calculator">
          <input type="number" className="w-24 rounded-md border border-gray-300 px-3 py-1.5 text-sm" value={settings.avg_standup_minutes} onChange={(e) => setSettings({ ...settings, avg_standup_minutes: Number(e.target.value) })} />
        </Field>
        <Field label="Hourly rate (USD) — leave blank to keep dollar figures hidden everywhere">
          <input
            type="number"
            className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={settings.hourly_rate_usd ?? ""}
            onChange={(e) => setSettings({ ...settings, hourly_rate_usd: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>

        <button onClick={handleSave} className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white">
          Save
        </button>
        {saved && <span className="ml-3 text-sm text-emerald-600">Saved.</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
