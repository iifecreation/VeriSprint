"use client";

import { useState } from "react";
import { API_BASE_URL } from "@/lib/config";

const REASON_OPTIONS = [
  { value: "enterprise", label: "Enterprise & Agency plans" },
  { value: "security", label: "Security questions" },
  { value: "bug_report", label: "Something looks wrong" },
  { value: "other", label: "Anything else" },
] as const;

/**
 * Posts straight to the API's public `/contact` endpoint (rate-limited,
 * see app/routers/contact.py) — the submission is saved and shows up in
 * the Super-Admin Dashboard's Messages panel immediately, with a
 * best-effort notification email to the internal team on top of that.
 * Not a mailto link: this is a real, stored lead, not just an outbound
 * email your mail client may or may not actually send.
 */
export function ContactForm({ defaultReason = "other" }: { defaultReason?: (typeof REASON_OPTIONS)[number]["value"] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<string>(defaultReason);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason, message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Something went wrong sending that — try again in a moment.");
      }
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong sending that — try again in a moment.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-8 text-center">
        <p className="text-lg font-bold text-emerald-900">Message sent.</p>
        <p className="mt-2 text-sm text-emerald-400">
          We read every one of these ourselves — expect a reply at the email you gave us, usually within a day.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-semibold text-emerald-400 underline hover:text-emerald-900"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-neon-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-neon)]/30"
            placeholder="Ada Lovelace"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--text-dim)]">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-neon-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-neon)]/30"
            placeholder="you@company.com"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--text-dim)]">What&apos;s this about?</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--accent-neon-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-neon)]/30"
        >
          {REASON_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--text-dim)]">Message</label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-neon-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-neon)]/30"
          placeholder="What can we help with?"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-brand px-6 py-3 text-sm font-bold text-[#04201f] transition-all hover:opacity-90 hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
