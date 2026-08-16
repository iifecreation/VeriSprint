"""
Provider-agnostic LLM client.

Every LLM-backed feature in VeriSprint (diff analysis, Confidence Scores,
Repo Chat, Ticket Drift Detection, report drafting) calls the two primitives
at the bottom of this module — `_complete_json` and `_complete_text` — rather
than talking to Anthropic directly. That's what makes the Private/On-Prem LLM
option (spec Section 5.11) real rather than cosmetic: switching
`LLM_PROVIDER=openai_compatible` re-points every one of those call sites at a
self-hosted server without touching a single business-logic function.

Providers:
  - "anthropic" (default): the Claude API, or a private VPC/Bedrock-style
    endpoint via ANTHROPIC_BASE_URL — how most security-conscious Claude
    customers actually run "on-prem".
  - "openai_compatible": a self-hosted server (vLLM, Ollama, LM Studio,
    text-generation-webui, ...) that exposes an OpenAI-style
    `/chat/completions` endpoint, for customers who cannot send code to any
    third-party API at all.

Neither branch ever fabricates a result on failure — a malformed or
unparseable model response raises, it does not fall back to a canned answer.
"""
import json
from functools import lru_cache
from uuid import UUID

import anthropic
import httpx
from sqlalchemy import select

from app.config import get_settings
from app.db.models import Commit, EvidenceItem
from app.db.session import AsyncSessionLocal
from app.schemas import EvidenceItemOut, RepoChatAnswer

settings = get_settings()


@lru_cache
def _anthropic_client() -> anthropic.Anthropic:
    kwargs: dict = {"api_key": settings.anthropic_api_key or None}
    if settings.anthropic_base_url:
        kwargs["base_url"] = settings.anthropic_base_url
    return anthropic.Anthropic(**kwargs)


def _require_on_prem_config() -> None:
    if not settings.on_prem_llm_base_url or not settings.on_prem_llm_model:
        raise RuntimeError(
            "LLM_PROVIDER=openai_compatible requires ON_PREM_LLM_BASE_URL and "
            "ON_PREM_LLM_MODEL to be set (ON_PREM_LLM_API_KEY if your server requires auth)."
        )


def _openai_compatible_headers() -> dict:
    headers = {"Content-Type": "application/json"}
    if settings.on_prem_llm_api_key:
        headers["Authorization"] = f"Bearer {settings.on_prem_llm_api_key}"
    return headers


def _complete_json(system: str, user: str, schema: dict, max_tokens: int = 2048) -> dict:
    """Ask the configured LLM provider for a response matching `schema`, and return the parsed dict."""
    if settings.llm_provider == "openai_compatible":
        _require_on_prem_config()
        resp = httpx.post(
            f"{settings.on_prem_llm_base_url.rstrip('/')}/chat/completions",
            headers=_openai_compatible_headers(),
            json={
                "model": settings.on_prem_llm_model,
                "max_tokens": max_tokens,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            f"{system}\n\nRespond with ONLY a single JSON object matching this "
                            f"JSON Schema, no prose, no markdown fences:\n{json.dumps(schema)}"
                        ),
                    },
                    {"role": "user", "content": user},
                ],
            },
            timeout=120,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return json.loads(content)

    response = _anthropic_client().messages.create(
        model=settings.anthropic_model,
        max_tokens=max_tokens,
        output_config={"format": {"type": "json_schema", "schema": schema}},
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def _complete_text(system: str, user: str, max_tokens: int = 1024) -> str:
    """Ask the configured LLM provider for a plain-text response."""
    if settings.llm_provider == "openai_compatible":
        _require_on_prem_config()
        resp = httpx.post(
            f"{settings.on_prem_llm_base_url.rstrip('/')}/chat/completions",
            headers=_openai_compatible_headers(),
            json={
                "model": settings.on_prem_llm_model,
                "max_tokens": max_tokens,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]

    response = _anthropic_client().messages.create(
        model=settings.anthropic_model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return next(b.text for b in response.content if b.type == "text")


# ---------------------------------------------------------------------------
# Step 3: diff analysis -> EvidenceItems
# ---------------------------------------------------------------------------

EVIDENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {
            "type": "string",
            "description": "One or two plain-English sentences describing what this commit actually does.",
        },
        "evidence_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "kind": {
                        "type": "string",
                        "enum": [
                            "test_added",
                            "test_missing",
                            "todo_found",
                            "dead_code",
                            "call_graph_change",
                            "risk",
                        ],
                    },
                    "description": {"type": "string"},
                    "file_path": {"type": "string"},
                    "line_range": {"type": "string"},
                },
                "required": ["kind", "description"],
                "additionalProperties": False,
            },
        },
        "ticket_key": {
            "type": ["string", "null"],
            "description": "A ticket key (e.g. ENG-123) mentioned in the commit message, if any.",
        },
    },
    "required": ["summary", "evidence_items", "ticket_key"],
    "additionalProperties": False,
}


def analyze_commit_diff(commit_message: str, diff: str) -> dict:
    """Step 3: turn a commit's diff + message into a plain-English summary + structured EvidenceItems."""
    max_diff_chars = 60_000
    truncated = diff[:max_diff_chars]
    truncation_note = "\n\n[diff truncated for analysis]" if len(diff) > max_diff_chars else ""

    return _complete_json(
        system=(
            "You are a senior engineer reviewing a single commit for an engineering "
            "visibility tool. Read the commit message and diff, then report factually: "
            "what changed, whether tests were added or are conspicuously missing for the "
            "changed logic, any TODOs/FIXMEs introduced, any code that looks newly dead, "
            "and any call-graph-relevant changes (new callers/callees, changed signatures). "
            "Be conservative — only report what the diff actually shows."
        ),
        user=f"Commit message:\n{commit_message}\n\nDiff:\n{truncated}{truncation_note}",
        schema=EVIDENCE_SCHEMA,
        max_tokens=2048,
    )


# ---------------------------------------------------------------------------
# Step 4: ConfidenceScore engine
# ---------------------------------------------------------------------------

CONFIDENCE_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "integer", "description": "0-100 confidence the ticket's claimed work is actually done."},
        "rationale": {"type": "string", "description": "1-3 sentences citing the specific evidence that drove the score."},
    },
    "required": ["score", "rationale"],
    "additionalProperties": False,
}


def score_ticket_confidence(ticket_title: str, ticket_status: str, evidence: list[dict]) -> dict:
    evidence_text = "\n".join(
        f"- [{e['kind']}] {e['description']}" + (f" ({e['file_path']})" if e.get("file_path") else "")
        for e in evidence
    ) or "(no evidence found — no commits are linked to this ticket)"

    return _complete_json(
        system=(
            "You score how confident a PM should be that a ticket's claimed work is "
            "actually done, based only on the evidence extracted from linked commits. "
            "Missing tests for new logic, TODOs, or no linked commits at all should lower "
            "the score. Cite the specific evidence in your rationale — never speculate "
            "beyond what's given."
        ),
        user=f"Ticket: {ticket_title}\nStatus: {ticket_status}\n\nEvidence from linked commits:\n{evidence_text}",
        schema=CONFIDENCE_SCHEMA,
        max_tokens=512,
    )


# ---------------------------------------------------------------------------
# Ticket Drift Detector
# ---------------------------------------------------------------------------

DRIFT_SCHEMA = {
    "type": "object",
    "properties": {
        "drifted": {
            "type": "boolean",
            "description": "True only if the real shipped evidence covers meaningfully more/different scope than the acceptance criteria describe.",
        },
        "explanation": {
            "type": "string",
            "description": "1-3 sentences, phrased as a question to the PM, citing the specific evidence that expanded scope. Empty string if drifted is false.",
        },
    },
    "required": ["drifted", "explanation"],
    "additionalProperties": False,
}


def detect_ticket_drift(ticket_title: str, acceptance_criteria: str, evidence: list[dict]) -> dict:
    evidence_text = "\n".join(
        f"- [{e['kind']}] {e['description']}" + (f" ({e['file_path']})" if e.get("file_path") else "")
        for e in evidence
    ) or "(no evidence yet)"

    return _complete_json(
        system=(
            "You compare a ticket's stated acceptance criteria against the real evidence of "
            "what was shipped for it, and flag only genuine, meaningful scope drift — not "
            "reasonable implementation detail. Be conservative: most tickets do NOT drift. "
            "Frame any drift you do find as a question for the PM, never an accusation."
        ),
        user=(
            f"Ticket: {ticket_title}\n\n"
            f"Acceptance criteria:\n{acceptance_criteria}\n\n"
            f"Evidence of what was actually shipped:\n{evidence_text}"
        ),
        schema=DRIFT_SCHEMA,
        max_tokens=512,
    )


# ---------------------------------------------------------------------------
# Report drafting (sprint rollup / investor update / onboarding doc / client portal)
# ---------------------------------------------------------------------------

REPORT_SYSTEM_PROMPTS = {
    "sprint_rollup": (
        "You write a stakeholder-facing sprint rollup: what actually shipped vs. what was "
        "planned, grounded strictly in the evidence and tickets given. Note any planned "
        "tickets that show no shipped evidence. Plain English, no code shown, no fabricated "
        "detail beyond what's provided."
    ),
    "investor_update": (
        "You draft the 'what we built' section of a monthly investor update from verified "
        "engineering activity. Plain English for a non-technical reader, confident but "
        "accurate — describe only what the evidence actually shows, in terms of outcomes "
        "and capabilities delivered, not implementation detail."
    ),
    "client_portal": (
        "You write a client-facing proof-of-work summary for an agency's client. Plain "
        "English, no code or technical jargon, no internal ticket IDs unless the client "
        "would recognize them. Describe only what the evidence actually shows was delivered."
    ),
    "onboarding_doc": (
        "You write onboarding documentation for a new engineer joining this codebase: how "
        "it's structured, what changed recently and why, based strictly on the file paths, "
        "commit summaries, and evidence given. Do not invent structure or history that "
        "isn't reflected in the provided material."
    ),
}


def draft_report(report_type: str, title: str, context: str) -> str:
    system = REPORT_SYSTEM_PROMPTS.get(report_type)
    if system is None:
        raise ValueError(f"Unknown report_type: {report_type}")
    return _complete_text(
        system=system,
        user=f"{title}\n\n{context}",
        max_tokens=2048,
    )


# ---------------------------------------------------------------------------
# Repo Chat
# ---------------------------------------------------------------------------


async def answer_repo_chat_question(repo_id: UUID, question: str, asked_by: str | None = None) -> RepoChatAnswer:
    """
    Repo Chat: answer a natural-language question about a repo's history using its
    EvidenceItems as context. Retrieval is a recency-ordered pull rather than
    pgvector similarity search — swap in an embedding search once an embedding
    model is configured; the `embedding` column on EvidenceItem is already there.
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(EvidenceItem)
            .join(Commit, EvidenceItem.commit_id == Commit.id)
            .where(Commit.repo_id == repo_id)
            .order_by(EvidenceItem.created_at.desc())
            .limit(40)
        )
        items = list(result.scalars().all())

    context = "\n".join(f"- ({item.id}) [{item.kind.value}] {item.description}" for item in items) or "(no evidence available for this repo yet)"

    answer_text = _complete_text(
        system=(
            "You answer questions about a codebase's recent activity using only the "
            "evidence items provided. Cite the evidence IDs you relied on in square "
            "brackets, e.g. [abc-123]. If the evidence doesn't answer the question, say so."
        ),
        user=f"Evidence:\n{context}\n\nQuestion: {question}",
        max_tokens=1024,
    )

    cited_ids = {str(item.id) for item in items if str(item.id) in answer_text}
    citations = [EvidenceItemOut.model_validate(item) for item in items if str(item.id) in cited_ids]

    # Log every interaction (Section 8 data model: ChatQuery) — auditability,
    # and the basis for improving retrieval later.
    from app.db.models import ChatQuery

    async with AsyncSessionLocal() as db:
        db.add(
            ChatQuery(
                repo_id=repo_id,
                asked_by=asked_by,
                question=question,
                answer=answer_text,
                cited_evidence_ids=[str(i) for i in cited_ids],
            )
        )
        await db.commit()

    return RepoChatAnswer(answer=answer_text, citations=citations)
