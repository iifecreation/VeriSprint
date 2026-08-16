"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, api } from "@/lib/api";
import { storeTokens } from "@/lib/auth";

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
      router.push(pair.user.role === "super_admin" ? "/admin" : "/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
      <p className="mt-1 text-sm text-gray-500">Use your workspace email/password, or continue with GitHub.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs text-gray-500">Email</label>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Password</label>
          <input
            type="password"
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <a
        href={`${API_BASE_URL}/auth/github/login`}
        className="mt-4 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-900 hover:bg-gray-50"
      >
        Continue with GitHub
      </a>

      <a href={`${API_BASE_URL}/auth/sso/login`} className="mt-2 text-center text-xs text-gray-400 hover:text-gray-600">
        Enterprise SSO
      </a>
    </div>
  );
}
