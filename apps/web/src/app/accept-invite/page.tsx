"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { storeTokens } from "@/lib/auth";
import { ADMIN_APP_URL } from "@/lib/config";
import { Input, PrimaryButton } from "@/components/ui";

/** Where an invite email's link lands (`{web_base_url}/accept-invite?token=...`
 * — see `POST /auth/invite` in the API). Sets a password for the invited
 * account and signs them straight in, same token-pair flow as login.
 * Reads the token from `window.location.search` in an effect rather than
 * `useSearchParams()` — same pattern as auth/callback/page.tsx, avoiding
 * that hook's Suspense-boundary requirement for one query param. */
export default function AcceptInvitePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Deferred to a microtask — see Sidebar.tsx for why direct setState in
    // an effect body is avoided here.
    queueMicrotask(() => {
      setToken(new URLSearchParams(window.location.search).get("token"));
      setTokenChecked(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This invite link is missing its token — ask whoever invited you to resend it.");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const pair = await api.acceptInvite(token, password);
      storeTokens(pair);
      if (pair.user.role === "super_admin") {
        window.location.href = ADMIN_APP_URL;
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("This invite link is invalid or has expired — ask whoever invited you to send a new one.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden bg-sky-gradient">
      <div className="mx-auto flex min-h-[85vh] max-w-sm flex-col justify-center px-6 py-16">
        <div className="animate-fade-in-up rounded-3xl glass-card p-8">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-neon)] text-[#3f6212]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Set your password</h1>
          <p className="mt-1 text-sm text-slate-600">You&apos;ve been invited to a VeriSprint workspace. Choose a password to finish setting up your account.</p>

          {tokenChecked && !token && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              This link is missing its invite token. Check that you copied the full link from the invite email.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500">Password</label>
              <Input type="password" required minLength={10} className="mt-1.5 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="mt-1 text-xs text-slate-400">At least 10 characters.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500">Confirm password</label>
              <Input type="password" required className="mt-1.5 w-full" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <PrimaryButton type="submit" disabled={loading || !tokenChecked || !token} className="w-full">
              {loading ? "Setting up your account…" : "Set password & sign in"}
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}
