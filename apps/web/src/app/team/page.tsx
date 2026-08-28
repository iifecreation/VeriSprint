"use client";

import { useEffect, useState } from "react";
import { api, type PulseSurvey, type WorkingAgreement } from "@/lib/api";
import { useAccessTokenClaims } from "@/lib/auth";
import { Card, EmptyState, Input, PageHeader, PrimaryButton, SecondaryButton } from "@/components/ui";

const FLAG_KEY = "pulse_surveys";

/**
 * Team: Pulse Surveys (anonymous, single-question sentiment checks) and
 * Working Agreements (team-authored, versioned — never LLM-generated on
 * their behalf). Both share the same `pulse_surveys` feature flag.
 */
export default function TeamPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const claims = useAccessTokenClaims();
  const workspaceId = claims?.workspace_id ?? null;
  const role = claims?.role ?? null;
  const canManage = role === "workspace_admin" || role === "manager";

  useEffect(() => {
    api.resolvedFeatureFlags([FLAG_KEY]).then((r) => setEnabled(r.flags[FLAG_KEY] ?? false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader title="Team" subtitle="Pulse surveys and working agreements — how the team is doing, and how the team agreed to work." />

      {enabled === false && (
        <Card className="mt-8">
          <p className="text-sm text-[var(--text-dim)]">Not enabled for your workspace — a Super Admin can turn this on from the Operator Console.</p>
        </Card>
      )}

      {enabled && workspaceId && (
        <div className="mt-8 space-y-8">
          <PulseSurveysSection workspaceId={workspaceId} canManage={canManage} />
          <WorkingAgreementsSection workspaceId={workspaceId} canManage={canManage} />
        </div>
      )}

      {enabled && !workspaceId && (
        <p className="mt-8 text-sm text-[var(--text-dim)]">Sign in to a workspace to view this page.</p>
      )}
    </div>
  );
}

function PulseSurveysSection({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const [surveys, setSurveys] = useState<PulseSurvey[]>([]);
  const [question, setQuestion] = useState("");
  const [respondScore, setRespondScore] = useState<Record<string, number>>({});
  const [responded, setResponded] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "error">("idle");

  async function refresh() {
    setSurveys(await api.listPulseSurveys(workspaceId));
  }

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function handleCreate() {
    if (!question.trim()) return;
    await api.createPulseSurvey({ question: question.trim() });
    setQuestion("");
    await refresh();
  }

  async function handleRespond(surveyId: string) {
    const score = respondScore[surveyId] ?? 3;
    try {
      await api.respondToPulseSurvey(surveyId, score);
      setResponded((r) => ({ ...r, [surveyId]: true }));
      await refresh();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--foreground)]">Pulse surveys</h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">Responses are genuinely anonymous — no name is ever attached, even in the audit trail.</p>

      {canManage && (
        <Card className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <label className="block text-xs font-semibold text-[var(--text-dim)]">New question</label>
            <Input className="mt-1.5 w-full" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="How sustainable does this sprint's pace feel?" />
          </div>
          <PrimaryButton onClick={handleCreate} disabled={!question.trim()}>Send survey</PrimaryButton>
        </Card>
      )}

      {status === "error" && <p className="mt-3 text-sm text-rose-600">Couldn&apos;t submit your response.</p>}

      <div className="mt-4 space-y-3">
        {surveys.length === 0 && <EmptyState title="No pulse surveys yet" body={canManage ? "Send one above." : "A manager or admin hasn't sent one yet."} />}
        {surveys.map((s) => (
          <Card key={s.id}>
            <p className="font-medium text-[var(--foreground)]">{s.question}</p>
            <p className="mt-1 text-xs text-[var(--text-dim)]">
              {s.response_count} response(s){s.average_score !== null && <> · avg {s.average_score}/5</>}
              {s.closes_at && <> · closes {new Date(s.closes_at).toLocaleDateString()}</>}
            </p>
            {!responded[s.id] && (
              <div className="mt-3 flex items-center gap-2">
                <select
                  className="rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                  value={respondScore[s.id] ?? 3}
                  onChange={(e) => setRespondScore((r) => ({ ...r, [s.id]: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <SecondaryButton onClick={() => handleRespond(s.id)}>Respond anonymously</SecondaryButton>
              </div>
            )}
            {responded[s.id] && <p className="mt-3 text-xs font-medium text-emerald-600">Thanks — your response was recorded anonymously.</p>}
          </Card>
        ))}
      </div>
    </section>
  );
}

function WorkingAgreementsSection({ workspaceId, canManage }: { workspaceId: string; canManage: boolean }) {
  const [agreements, setAgreements] = useState<WorkingAgreement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);

  async function refresh() {
    setAgreements(await api.listWorkingAgreements(workspaceId));
  }

  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function handleSave() {
    if (!title.trim() || !body.trim()) return;
    await api.upsertWorkingAgreement(title.trim(), { body_markdown: body.trim() });
    setTitle("");
    setBody("");
    setEditingTitle(null);
    await refresh();
  }

  function startEdit(a: WorkingAgreement) {
    setTitle(a.title);
    setBody(a.body_markdown);
    setEditingTitle(a.title);
  }

  return (
    <section>
      <h2 className="text-lg font-bold text-[var(--foreground)]">Working agreements</h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">Real text the team wrote — never generated on their behalf.</p>

      {canManage && (
        <Card className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)]">Title</label>
            <Input className="mt-1.5 w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Code review SLA" disabled={editingTitle !== null} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-dim)]">Agreement text (Markdown)</label>
            <textarea
              className="mt-1.5 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent-neon-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-neon)]/30"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <PrimaryButton onClick={handleSave} disabled={!title.trim() || !body.trim()}>{editingTitle ? "Save changes" : "Add agreement"}</PrimaryButton>
            {editingTitle && <SecondaryButton onClick={() => { setTitle(""); setBody(""); setEditingTitle(null); }}>Cancel</SecondaryButton>}
          </div>
        </Card>
      )}

      <div className="mt-4 space-y-3">
        {agreements.length === 0 && <EmptyState title="No working agreements yet" body={canManage ? "Add one above." : "A manager or admin hasn't written one yet."} />}
        {agreements.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-[var(--foreground)]">{a.title}</h3>
              {canManage && <SecondaryButton className="px-3 py-1 text-xs" onClick={() => startEdit(a)}>Edit</SecondaryButton>}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-muted)]">{a.body_markdown}</p>
            <p className="mt-2 text-xs text-[var(--text-dim)]">Updated {new Date(a.updated_at).toLocaleDateString()}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
