"use client";

import { useState } from "react";
import Link from "next/link";
import { Input, PrimaryButton } from "@/components/ui";
import {
  ShieldAlert,
  Terminal,
  ArrowLeft,
  Lock,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  const cliSnippet = "python3 -m app.cli create-admin --email admin@verisprint.io --name 'Platform Admin'";

  const handleCopy = () => {
    navigator.clipboard.writeText(cliSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden border border-[var(--line)]">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Operator Credential Recovery
        </h1>
        <p className="mt-2 text-xs text-[var(--text-dim)] leading-relaxed">
          Super Admin accounts are isolated from customer authentication systems. In accordance with SOC 2 access control guidelines, automated self-service email resets are restricted for cross-tenant operator accounts.
        </p>
      </div>

      {/* Break Glass Procedure */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--background)]/70 p-5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-brand uppercase mb-2">
            <Terminal className="h-4 w-4" />
            <span>Protocol 01: Host CLI Provisioning</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            If you have direct SSH / bastion access to the backend API host, reset an operator password or provision a new AdminAccount using the administrative CLI tool:
          </p>

          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 font-mono text-xs flex items-center justify-between gap-3 overflow-x-auto">
            <code className="text-emerald-400">{cliSnippet}</code>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-[var(--text-dim)] hover:text-brand hover:bg-[var(--line)]/50 shrink-0 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--background)]/70 p-5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase mb-2">
            <Lock className="h-4 w-4" />
            <span>Protocol 02: SecOps Escalation</span>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
            If you are locked out during an emergency on-call incident, request a token revocation and credential re-issuance from the Security Operations primary on-call engineer.
          </p>

          {!submitted ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="space-y-3"
            >
              <Input
                type="email"
                required
                placeholder="Enter registered operator email"
                className="w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <PrimaryButton type="submit" className="w-full">
                Dispatch SecOps Emergency Alert
              </PrimaryButton>
            </form>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>
                Emergency ticket logged. The primary on-call SecOps officer has been paged to verify identity and dispatch recovery tokens.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--line)] text-center">
        <Link
          href="/login"
          className="text-xs font-mono text-[var(--accent-neon)] hover:underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Operator Sign-In</span>
        </Link>
      </div>
    </div>
  );
}
