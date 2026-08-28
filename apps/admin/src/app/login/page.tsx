"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { storeTokens } from "@/lib/auth";
import { Input, PrimaryButton } from "@/components/ui";

/** Operator sign-in — deliberately no self-serve signup here; Super Admin
 * accounts are provisioned directly, never through invite/checkout flows. */
export default function AdminLoginPage() {
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
      if (pair.user.role !== "super_admin") {
        setError("This account isn't an operator account.");
        setLoading(false);
        return;
      }
      storeTokens(pair);
      router.push("/");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-neon)] text-[#04201f]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </span>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Operator sign-in</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">VeriSprint internal console — Super Admin accounts only.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">Email</label>
          <Input type="email" required className="w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--text-dim)]">Password</label>
          <Input type="password" required className="w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <PrimaryButton type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--text-dim)]">
        Operator accounts are provisioned directly — no self-serve signup.
      </p>
    </div>
  );
}
