"use client";

import { useState } from "react";
import { api, type EvidenceItem } from "@/lib/api";
import { RepoPicker } from "@/components/RepoPicker";
import { Input, PageHeader, PrimaryButton } from "@/components/ui";

type Exchange = { question: string; answer: string; citations: EvidenceItem[] };

/** AI Repo Chat ("Ask Your Codebase") — spec Section 5.1. */
export default function ChatPage() {
  const [repoId, setRepoId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!repoId || !question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.repoChat(repoId, question.trim());
      setExchanges((prev) => [...prev, { question: question.trim(), answer: result.answer, citations: result.citations }]);
      setQuestion("");
    } catch {
      setError("Couldn't reach the API — check ANTHROPIC_API_KEY is configured server-side.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <PageHeader
        title="Ask Your Codebase"
        subtitle="Plain-English questions over real commit history, with citations."
        actions={<RepoPicker selectedRepoId={repoId} onChange={setRepoId} />}
      />

      <div className="mt-8 space-y-4">
        {exchanges.map((ex, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto max-w-md rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white">{ex.question}</div>
            <div className="glass-card max-w-lg rounded-2xl px-4 py-3 text-sm text-slate-800">
              <p className="whitespace-pre-wrap">{ex.answer}</p>
              {ex.citations.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-slate-200 pt-2 text-xs text-slate-500">
                  {ex.citations.map((c) => (
                    <li key={c.id}>
                      [{c.id.slice(0, 8)}] {c.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {exchanges.length === 0 && (
          <p className="text-sm text-slate-500">
            Try: &ldquo;What shipped this week?&rdquo; or &ldquo;Did we finish the login flow?&rdquo;
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-6 flex gap-2">
        <Input
          className="flex-1"
          placeholder="Ask a question about this repo..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          disabled={!repoId}
        />
        <PrimaryButton onClick={handleAsk} disabled={!repoId || !question.trim() || loading}>
          {loading ? "Asking…" : "Ask"}
        </PrimaryButton>
      </div>
    </div>
  );
}
