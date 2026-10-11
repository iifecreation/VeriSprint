"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { storeTokens } from "@/lib/auth";
import { ADMIN_APP_URL } from "@/lib/config";
import { Input, PrimaryButton } from "@/components/ui";

/** Where a password-reset email's link lands (`{web_base_url}/reset-password
 * ?token=...` — see `POST /auth/request-password-reset`). Reads the token
 * from `window.location.search` in an effect — same pattern as
 * auth/callback/page.tsx, avoiding useSearchParams()'s Suspense-boundary
 * requirement for one query param. */
export default function ResetPasswordPage() {
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
      setError("This reset link is missing its token — request a new one from the sign-in page.");
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
      const pair = await api.resetPassword(token, password);
      storeTokens(pair);
      if (pair.user.role === "super_admin") {
        window.location.href = ADMIN_APP_URL;
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("This reset link is invalid or has expired — request a new one from the sign-in page.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden bg-sky-gradient">
      <div className="mx-auto flex min-h-[85vh] max-w-sm flex-col justify-center px-6 py-16">
        <div className="animate-fade-in-up rounded-3xl glass-card p-8">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-neon)] text-[#04201f]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </span>
          <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Choose a new password</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Set a new password for your account.</p>

          {tokenChecked && !token && (
            <p className="mt-4 rounded-lg bg-amber-500/15 p-3 text-sm text-amber-400">
              This link is missing its reset token. Check that you copied the full link from the reset email, or{" "}
              <a href="/forgot-password" className="underline">request a new one</a>.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-dim)]">New password</label>
              <Input type="password" required minLength={10} className="mt-1.5 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="mt-1 text-xs text-[var(--text-dim)]">At least 10 characters.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-dim)]">Confirm new password</label>
              <Input type="password" required className="mt-1.5 w-full" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <PrimaryButton type="submit" disabled={loading || !tokenChecked || !token} className="w-full">
              {loading ? "Updating password…" : "Update password & sign in"}
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
}
