# VeriSprint

A proof-of-work engine for software teams: turns real GitHub activity into a
verified, plain-language account of what was actually built, reconciled
against what was claimed in tickets and standups — "say vs show," with every
judgment traceable to specific evidence.

See [docs/BUILD_BRIEF.md](docs/BUILD_BRIEF.md) for the original Phase 1 (MVP)
brief, and [docs/PHASE_2_3_FEATURES.md](docs/PHASE_2_3_FEATURES.md) for the
full Phase 2/3/Enterprise feature set implemented on top of it — including
what's genuinely verified end-to-end vs. what needs real external credentials
(a live IdP, a real Slack workspace, etc.) to prove out beyond code review.

## Stack

- **Frontend:** Next.js + React + Tailwind (`apps/web`)
- **Backend/API:** FastAPI (Python, async) (`apps/api`)
- **Database:** Postgres + pgvector (structured data + Repo Chat retrieval)
- **Queue:** Redis-backed [arq](https://arq-docs.helpmanual.io/), including a daily cron dispatcher
- **LLM:** provider-agnostic — Claude API by default, or a self-hosted OpenAI-compatible server (see [Private/On-Prem LLM](#privateon-prem-llm-option))
- **Auth:** GitHub OAuth + GitHub App install (read-only) for login/repo access; optional generic OIDC SSO for Enterprise
- **Notifications:** Slack app (Bolt) + Resend email for daily digests, `/verisprint` Repo Chat

## Project layout

```
apps/
  web/              Next.js frontend — 13 pages: dashboard, dev view, chat,
                     standups, sprints/burndown, reports, orphan commits,
                     accuracy, ROI, audit log, settings, public client portal
  api/              FastAPI backend
    app/
      routers/      ~20 HTTP route modules
      workers/      arq background jobs (ingestion, analysis, confidence,
                     reconciliation, drift, orphans, anomalies, reports, digest)
      integrations/ GitHub, LLM (provider-agnostic), Slack, email, Jira,
                     SSO/OIDC, object storage clients
      db/           SQLAlchemy models + session
      queue/        arq client + WorkerSettings (+ daily cron)
      audit.py       compliance audit-log helper
    alembic/         DB migrations
docker-compose.yml   Postgres (pgvector) + Redis for local dev
```

## Local setup

**1. Infra**

```bash
docker-compose up -d
```

Uses non-default ports (Postgres `55432`, Redis `56379`) so this doesn't
collide with other local projects — see the compose file if you want to
change them.

**2. Backend**

```bash
cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp ../../.env.example ../../.env   # then fill in ANTHROPIC_API_KEY at minimum
alembic upgrade head
uvicorn app.main:app --reload --port 58000
```

In a second terminal, run the background worker (needed for ingestion,
analysis, drift/orphan/anomaly detection, reports, and digests):

```bash
cd apps/api && source .venv/bin/activate
arq app.queue.worker.WorkerSettings
```

**3. Frontend**

```bash
cd apps/web
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:58000" > .env.local
npm run dev -- --port 53000
```

Visit http://localhost:53000. (Also non-default ports — see `.env.example`.)

## Feature map

| Feature (spec section) | Backend | Frontend |
|---|---|---|
| Deep commit/PR analysis, Evidence Ledger, Confidence Score (Phase 1) | `workers/analysis.py`, `workers/confidence.py` | `/dashboard`, `/dev` |
| Claimed vs Shipped, mismatch flags (Phase 1) | `workers/reconciliation.py` | `/dashboard`, `/dev` |
| Auto-drafted standup (Phase 1) | `workers/standup.py` | `/standup` |
| AI Repo Chat (5.1) | `integrations/llm_client.py`, `routers/chat.py` | `/chat` |
| Slack/email digests (Phase 2) | `workers/digest.py`, daily cron | Slack, email |
| Historical accuracy (Phase 2) | `routers/accuracy.py` | `/accuracy` |
| Ticket Drift Detector (5.5) | `workers/drift.py` | ticket flags on `/dashboard` |
| Orphan Commit Detector (5.6) | `workers/orphans.py` | `/orphan-commits` |
| Cross-file impact map (Phase 2) | `GET /tickets/{id}/impact-map` | — (API only) |
| Client Proof-of-Work Portal (5.2) | `routers/reports.py`, `routers/client_portal.py` | `/reports`, public `/portal/[token]` |
| Investor Update Generator (5.3) | `workers/reports.py` | `/reports` |
| Confidence-Weighted Burndown (5.7) | `routers/sprints.py` | `/sprints` |
| Onboarding Doc Generator (5.8) | `workers/reports.py` + `integrations/github_client.py` | `/reports` |
| Async Standup Replacement + ROI (5.4) | `routers/roi.py` | `/roi` |
| Anomaly check-in nudges (5.9) | `workers/anomaly.py` | flags on `/dashboard` |
| Multi-repo intelligence (5.10) | `routers/work_units.py` | — (API only) |
| Private/On-Prem LLM (5.11) | `integrations/llm_client.py` (provider dispatch) | — (config only) |
| SSO (5.11) | `integrations/sso_client.py`, `routers/sso.py` | login redirect only |
| Compliance & Audit Trail (5.12) | `audit.py`, `routers/audit.py` | `/audit` |

## Demo checklist (Phase 1 definition of done)

- [ ] One real GitHub repo connected live, showing actual analyzed commits
- [ ] At least one ticket with a visible Confidence Score + Evidence Ledger
- [ ] One Claimed vs Shipped mismatch flag, shown as a question
- [ ] One auto-drafted standup update generated from real commits

## Environment variables

See [.env.example](.env.example) for the full list. What matters for the
demo: `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` / `GITHUB_WEBHOOK_SECRET`,
`ANTHROPIC_API_KEY`, `DATABASE_URL`. For the Phase 2/3 features:
`SLACK_BOT_TOKEN`/`SLACK_SIGNING_SECRET` (digests, Repo Chat in Slack),
`RESEND_API_KEY` (email digests), `OIDC_*` (SSO — see below).

### Private/On-Prem LLM option

Every LLM call in the app (diff analysis, Confidence Scores, Repo Chat,
drift detection, report drafting) goes through `app/integrations/llm_client.py`,
which dispatches to one of two providers based on `LLM_PROVIDER`:

- `anthropic` (default) — the Claude API. Set `ANTHROPIC_BASE_URL` to point
  at a private VPC endpoint or proxy instead of the public API.
- `openai_compatible` — a self-hosted server (vLLM, Ollama, LM Studio,
  text-generation-webui, ...) that exposes an OpenAI-style
  `/chat/completions` endpoint. Set `ON_PREM_LLM_BASE_URL` and
  `ON_PREM_LLM_MODEL` (and `ON_PREM_LLM_API_KEY` if your server needs auth).

No code changes needed to switch — it's one env var.

### SSO

`OIDC_ISSUER` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` / `OIDC_REDIRECT_URL`
enable a real Authorization Code + PKCE flow against any standard OIDC
identity provider, as an alternative to GitHub OAuth. This code is
functionally complete and was verified to fail cleanly (a clear `501`, not a
crash) when unconfigured — it has not been run against a live customer IdP,
since none is available in this environment. Activating it for a customer
means registering `OIDC_REDIRECT_URL` as an allowed callback in their IdP.

## What's genuinely verified vs. what needs real credentials

Everything backed by the database — the domain model, all business logic
(Confidence Scores, reconciliation, drift/orphan/anomaly detection, the
confidence-weighted burndown, ROI math, audit trail) — was exercised against
a real running Postgres instance during development, including the failure
paths (e.g. a report generation attempt without `ANTHROPIC_API_KEY` correctly
lands in a `failed` state with no fabricated content, never a fake summary).

What hasn't run against real external services in this environment, because
doing so needs credentials only you can provide:

- GitHub App webhooks (needs a registered GitHub App + a real repo)
- Slack digest delivery and the `/verisprint` slash command (needs a Slack app)
- Resend email digests (needs a Resend API key)
- SSO (needs a real customer identity provider)
- The self-hosted/on-prem LLM path (needs an actual vLLM/Ollama/etc. server running)
- Jira/Linear ticket sync (manual ticket entry works without it)
