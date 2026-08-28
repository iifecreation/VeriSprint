"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Input, PrimaryButton } from "@/components/ui";

/** Requests a password-reset email (`POST /auth/request-password-reset`).
 * Always shows the same success message regardless of whether the email
 * matched an account — the API itself doesn't reveal that either, so the
 * frontend shouldn't leak it via a different UI state. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.requestPasswordReset(email);
    } finally {
      // Same outcome shown either way — see the docstring above.
      setSent(true);
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
          <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">Reset your password</h1>

          {sent ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              If that email has an account, a reset link is on its way — it expires in 1 hour. Didn&apos;t get it?
              Check spam, or try again in a few minutes.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Enter your email and we&apos;ll send a link to set a new password.</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-dim)]">Email</label>
                  <Input type="email" required className="mt-1.5 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <PrimaryButton type="submit" disabled={loading} className="w-full">
                  {loading ? "Sending…" : "Send reset link"}
                </PrimaryButton>
              </form>
            </>
          )}

          <a href="/login" className="mt-6 block text-center text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)]">
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
