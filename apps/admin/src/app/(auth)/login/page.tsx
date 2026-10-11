"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { storeTokens } from "@/lib/auth";
import { Input, PrimaryButton, Spinner } from "@/components/ui";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const pair = await api.login(email.trim(), password);
      storeTokens(pair);
      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("429")) {
          setError("Rate limit exceeded. Too many failed attempts; please wait 5 minutes.");
        } else if (err.message.includes("Server unreachable")) {
          setError(err.message);
        } else {
          setError("Invalid operator credentials or inactive account.");
        }
      } else {
        setError("Invalid operator credentials or inactive account.");
      }
    } finally {
      setLoading(false);
    }
  }

  const fillDevCredentials = () => {
    setEmail("superadmin@verisprint.dev");
    setPassword("OperatorPass123!");
    setError(null);
  };

  return (
    <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden border border-[var(--line)]">
      {/* Subtle Ambient Light */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[var(--accent-neon)]/10 blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-neon)]/15 border border-[var(--accent-neon)]/30 text-[var(--accent-neon)] shadow-inner">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Platform Admin Sign-In</h1>
        <p className="mt-2 text-xs text-[var(--text-dim)] leading-relaxed">
          VeriSprint Super Admin Console. Authentication issues rotatable operator JWTs with cross-tenant administrative scopes.
        </p>
      </div>

      {/* Security Indicator */}
      <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--background)]/60 p-3 flex items-center justify-between text-[11px] font-mono text-[var(--text-dim)]">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Zero-Trust Endpoint</span>
        </span>
        <button
          type="button"
          onClick={fillDevCredentials}
          className="flex items-center gap-1 text-[var(--accent-neon)] hover:underline font-bold"
          title="Autofill local development credentials"
        >
          <Sparkles className="h-3 w-3" />
          <span>Dev Autofill</span>
        </button>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-1.5">
            Operator Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
            <Input
              type="email"
              required
              autoFocus
              placeholder="superadmin@verisprint.dev"
              className="w-full pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              Master Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-mono text-[var(--accent-neon)] hover:underline"
            >
              Break-glass reset?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-dim)]" />
            <Input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••••••••••"
              className="w-full pl-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--foreground)] transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <PrimaryButton type="submit" disabled={loading} className="w-full mt-2 py-3 text-sm">
          {loading ? (
            <>
              <Spinner className="h-4 w-4 text-[#04201f]" />
              <span>Verifying Credentials…</span>
            </>
          ) : (
            <>
              <span>Authenticate Operator</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </PrimaryButton>
      </form>

      {/* Provisioning Notice */}
      <div className="mt-8 pt-6 border-t border-[var(--line)]/60 text-center">
        <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">
          Operator accounts are provisioned via internal CLI. No self-serve signup is enabled on this endpoint.
        </p>
      </div>
    </div>
  );
}
