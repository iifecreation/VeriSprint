"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, api } from "@/lib/api";
import { storeTokens } from "@/lib/auth";
import { ADMIN_APP_URL } from "@/lib/config";
import { Input, PrimaryButton } from "@/components/ui";

/** Email/password login (spec Section 6's fallback path). GitHub OAuth is the
 * primary path — see the "Continue with GitHub" link below, which redirects
 * to the API and comes back to /auth/callback with a token pair. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const pair = await api.login(email, password);
      storeTokens(pair);
      if (pair.user.role === "super_admin") {
        // Operators live in a separate console (apps/admin), not this app.
        window.location.href = ADMIN_APP_URL;
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password.");
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
          <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Sign in</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Use your workspace email/password, or continue with GitHub.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-dim)]">Email</label>
              <Input type="email" required className="mt-1.5 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[var(--text-dim)]">Password</label>
                <a href="/forgot-password" className="text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text-muted)]">
                  Forgot password?
                </a>
              </div>
              <Input type="password" required className="mt-1.5 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <PrimaryButton type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </PrimaryButton>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs text-[var(--text-dim)]">
            <div className="h-px flex-1 bg-[var(--line)]" />
            or
            <div className="h-px flex-1 bg-[var(--line)]" />
          </div>

          <a
            href={`${API_BASE_URL}/auth/github/login`}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--background)]"
          >
            Continue with GitHub
          </a>

          <a href={`${API_BASE_URL}/auth/sso/login`} className="mt-3 block text-center text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)]">
            Enterprise SSO
          </a>
        </div>
      </div>
    </div>
  );
}
