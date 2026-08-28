"use client";

import { useEffect, useState } from "react";
import { PageHeader, Section, Card } from "@/components/ui";
import { API_BASE_URL, CONTACT_EMAIL } from "@/lib/config";
import { HeroBackground } from "@/components/HeroBackground";

type CheckState = "checking" | "up" | "down";

type Check = {
  name: string;
  description: string;
  state: CheckState;
};

const INITIAL_CHECKS: Check[] = [
  { name: "API", description: "Core API — auth, tickets, reports, every dashboard endpoint.", state: "checking" },
  { name: "Database", description: "Postgres — the source of truth for every Evidence Item and score.", state: "checking" },
];

function Dot({ state }: { state: CheckState }) {
  const color = state === "up" ? "bg-emerald-500" : state === "down" ? "bg-rose-500" : "bg-[var(--text-dim)] animate-pulse";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />;
}

function Label({ state }: { state: CheckState }) {
  if (state === "checking") return <span className="text-[var(--text-dim)]">Checking…</span>;
  if (state === "up") return <span className="text-emerald-600 font-semibold">Operational</span>;
  return <span className="text-rose-600 font-semibold">Unavailable</span>;
}

/**
 * A genuinely live status page, not a static "all systems operational"
 * claim — it calls the same /health and /health/ready endpoints a load
 * balancer would, from the browser, right now. If the API is down, this
 * page says so, because it can't fake a response that never arrives.
 */
export default function StatusPage() {
  const [checks, setChecks] = useState<Check[]>(INITIAL_CHECKS);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function runChecks() {
    const [apiRes, readyRes] = await Promise.allSettled([
      fetch(`${API_BASE_URL}/health`, { cache: "no-store" }),
      fetch(`${API_BASE_URL}/health/ready`, { cache: "no-store" }),
    ]);
    setChecks([
      { name: "API", description: "Core API — auth, tickets, reports, every dashboard endpoint.", state: apiRes.status === "fulfilled" && apiRes.value.ok ? "up" : "down" },
      { name: "Database", description: "Postgres — the source of truth for every Evidence Item and score.", state: readyRes.status === "fulfilled" && readyRes.value.ok ? "up" : "down" },
    ]);
    setLastChecked(new Date());
  }

  useEffect(() => {
    // Deferred to a microtask — the effect body triggers a fetch (an
    // external system), so the resulting setState calls aren't a
    // synchronous render-triggering pattern even though the first one
    // looks like it is.
    queueMicrotask(() => {
      runChecks();
    });
    const interval = setInterval(runChecks, 30_000);
    return () => clearInterval(interval);
  }, []);

  const allUp = checks.every((c) => c.state === "up");
  const anyChecking = checks.some((c) => c.state === "checking");

  return (
    <>
      <Section
        variant="default"
        className="bg-[var(--background)] pb-16 border-b border-[var(--line)] relative overflow-hidden"
        background={<HeroBackground />}
      >
        <PageHeader
          title="System status"
          subtitle="Live checks against the same endpoints our own infrastructure monitors — not a manually-updated claim."
        />
      </Section>
      <Section>
        <div className="mx-auto max-w-2xl">
          <Card className={`mb-8 flex items-center gap-4 ${allUp ? "border-emerald-500/30 bg-emerald-500/15" : anyChecking ? "" : "border-rose-500/30 bg-rose-500/15"}`}>
            <Dot state={anyChecking ? "checking" : allUp ? "up" : "down"} />
            <div>
              <p className="font-bold text-[var(--foreground)]">
                {anyChecking ? "Checking system status…" : allUp ? "All systems operational" : "Some systems are experiencing issues"}
              </p>
              {lastChecked && (
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Last checked {lastChecked.toLocaleTimeString()} · rechecks automatically every 30s
                </p>
              )}
            </div>
          </Card>

          <div className="space-y-4">
            {checks.map((check) => (
              <Card key={check.name} className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{check.name}</p>
                  <p className="mt-1 text-sm text-[var(--text-dim)]">{check.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Dot state={check.state} />
                  <Label state={check.state} />
                </div>
              </Card>
            ))}
          </div>

          <p className="mt-10 text-center text-sm text-[var(--text-dim)]">
            This page checks the API directly from your browser — if your network blocks outbound requests to our
            API host, it may show unavailable even when the service is up. Persistent issues:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
