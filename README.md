# VeriSprint

A proof-of-work engine for software teams: turns real GitHub activity into a
verified, plain-language account of what was actually built, reconciled
against what was claimed in tickets and standups — "say vs show," with every
judgment traceable to specific evidence.

See [docs/BUILD_BRIEF.md](docs/BUILD_BRIEF.md) for the original Phase 1 (MVP)
brief, and [docs/PHASE_2_3_FEATURES.md](docs/PHASE_2_3_FEATURES.md) for the
Phase 2/3/Enterprise feature set. This README covers the v3 production build:
multi-tenant workspaces, full RBAC, billing, observability, a Super-Admin
Dashboard, a public marketing site, and the competitor-parity feature set
(DORA, Risk Radar, Value Stream View, PR AutoRoute, and more) — including
what's genuinely verified end-to-end vs. what needs real external credentials
(a live IdP, a real Stripe account, a real Slack workspace, etc.) to prove
out beyond code review.

## Stack

- **Frontend:** Next.js + React + Tailwind (`apps/web`) — dashboard app; `apps/marketing` — public site, separate deploy
- **Backend/API:** FastAPI (Python, async) (`apps/api`)
- **Database:** Postgres + pgvector (structured data + Repo Chat retrieval)
- **Queue:** Redis-backed [arq](https://arq-docs.helpmanual.io/), including a daily cron dispatcher and a 5-minute system-metrics cron
- **LLM:** provider-agnostic — Claude API by default, or a self-hosted OpenAI-compatible server (see [Private/On-Prem LLM](#privateon-prem-llm-option))
- **Auth:** JWT access/refresh tokens (`app/auth/`) with 5-role RBAC — GitHub OAuth (primary) or email/password (fallback) for login, GitHub App install (read-only) for repo access, optional per-workspace OIDC SSO + SCIM provisioning for Enterprise
- **Billing:** Stripe Checkout + Customer Portal + webhooks, synced to a `Subscription` record and gated via per-workspace `FeatureFlag`s
- **Observability:** DB-backed `ErrorEvent`/`SystemMetric` pipeline (the Super-Admin Dashboard's real data source) + optional Sentry
- **Notifications:** Slack app (Bolt) + Resend email for daily digests, `/verisprint` Repo Chat

## Project layout

```
apps/
  web/              Next.js frontend (app) — dashboard, dev view, chat,
                     standups, sprints/burndown, reports, orphan commits,
                     accuracy, ROI, audit log, settings, public client portal,
                     login/OAuth callback, Super-Admin Dashboard
  marketing/        Next.js public marketing site — homepage, features,
                     how it works, pricing, security & trust, docs,
                     changelog, about, contact — a separate app/deploy from
                     apps/web, with no auth or API-mutating calls of its own
  api/              FastAPI backend
    app/
      routers/      ~25 HTTP route modules
      workers/      arq background jobs (ingestion, analysis, confidence,
                     reconciliation, drift, orphans, anomalies, reports,
                     digest, system metrics)
      integrations/ GitHub, LLM (provider-agnostic), Slack, email, Jira,
                     SSO/OIDC, Stripe, object storage clients
      auth/          JWT issuance/verification + RBAC dependencies
      db/           SQLAlchemy models + session
      queue/        arq client + WorkerSettings (+ daily cron)
      audit.py       compliance audit-log helper
      observability.py  ErrorEvent/SystemMetric capture pipeline
      feature_flags.py  FeatureFlag gating (require_feature_flag dependency)
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

**4. Public marketing site (optional, separate app)**

```bash
cd apps/marketing
npm install
echo "NEXT_PUBLIC_APP_URL=http://localhost:53000" > .env.local
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:58000" >> .env.local
npm run dev -- --port 53100
```

Visit http://localhost:53100. This is a content-only site (no login, no
database access) — its "Connect a GitHub repo" and "Sign in" links point at
the API's install flow and the dashboard app's `/login` respectively.

## Auth & RBAC (v3)

Five roles, enforced server-side on every request via a JWT-embedded
`workspace_id` — see `app/auth/dependencies.py`:

| Role | Scope |
|---|---|
| `super_admin` | Internal operator only, never assigned to a customer. Bypasses workspace scoping everywhere (`ensure_workspace_access`) — powers the Super-Admin Dashboard. |
| `workspace_admin` | Full control within their own workspace: billing, integrations, users, settings. |
| `manager` | Full read access to dashboards/reports/audit trail; no billing. |
| `developer` | Own Evidence Ledger + standup drafts; read-only team dashboard. |
| `client` | Read-only Client Portal only — blocked from every internal route by `get_internal_user`, even ones scoped to their own workspace. |

Login paths: GitHub OAuth (primary), email/password (fallback, via invite or
password reset), or per-workspace OIDC SSO (Enterprise). All three converge
on the same JWT issuance (`app/auth/security.py`) — access tokens are
15-minute, refresh tokens are 30-day and rotate on every use, and logging
out (or a role/password change) bumps `token_version`, instantly revoking
every outstanding token for that user, not just future ones.

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
| Client Proof-of-Work Portal (5.2) | `routers/reports.py`, `routers/client_portal.py`, `ClientPortalLink` | `/reports`, public `/portal/[token]` |
| Investor Update Generator (5.3) | `workers/reports.py` | `/reports` |
| Confidence-Weighted Burndown (5.7) | `routers/sprints.py` | `/sprints` |
| Onboarding Doc Generator (5.8) | `workers/reports.py` + `integrations/github_client.py` | `/reports` |
| Async Standup Replacement + ROI (5.4) | `routers/roi.py` | `/roi` |
| Anomaly check-in nudges (5.9) | `workers/anomaly.py` | flags on `/dashboard` |
| Multi-repo intelligence (5.10) | `routers/work_units.py` | — (API only) |
| Private/On-Prem LLM (5.11) | `integrations/llm_client.py` (provider dispatch) | — (config only) |
| Compliance & Audit Trail (5.12) | `audit.py`, `routers/audit.py`, `routers/admin.py` (cross-tenant) | `/audit`, `/admin` |
| **Auth: JWT + RBAC + email/password fallback** | `app/auth/`, `routers/auth.py` | `/login`, `/auth/callback` |
| **Super-Admin Dashboard (8 panels)** | `routers/admin.py` | `/admin` |
| **Billing: Stripe + FeatureFlag gating** | `integrations/stripe_client.py`, `routers/billing.py`, `feature_flags.py` | `/insights` (gated panels) |
| **Error/metrics observability** | `observability.py`, global exception handler, `workers/metrics.py` cron | `/admin` (Errors, Metrics panels) |
| **Public marketing site (9 pages)** | — | `apps/marketing` (separate app) |
| **DORA Panel** | `routers/dora.py` | `/insights` |
| **Blocker Nudge Bot** | `workers/blockers.py` | flags on `/dashboard` |
| **Team Goals & Targets** | `goals.py`, `routers/goals.py` | `/insights` |
| **Code Health Signals** | `routers/code_health.py` | `/insights` |
| **Visual Changelog** | `routers/changelog.py` | — (API only) |
| **AI Contribution Tracker** | `routers/contributions.py` | — (API only) |
| **Investment Allocation Dashboard** | `routers/allocation.py` | — (API only) |
| **Risk Radar** | `routers/risk.py` | `/insights` |
| **Open Integration Framework (scaffolding)** | `routers/integrations.py` | — (API only) |
| **PR AutoRoute** | `routers/pr_autoroute.py` | — (API only) |
| **Pulse Surveys & Working Agreements** | `routers/pulse.py`, `routers/working_agreements.py` | — (API only) |
| **Delivery Forecast** (statistical, not ML — see router docstring) | `routers/forecast.py` | — (API only) |
| **Value Stream View** | `routers/value_stream.py`, `TicketStatusChange` | — (API only) |
| **Cost Capitalization Report** | `routers/capitalization.py` | — (API only) |
| **SSO/SCIM extension (per-workspace)** | `routers/sso_config.py`, `routers/scim.py` | — (API only) |

Routers marked "API only" are real, tested (see verification notes below),
and reachable via the documented endpoints — they don't yet have dedicated
frontend pages beyond what's surfaced on `/insights`.

## Demo checklist (Phase 1 definition of done)

- [ ] One real GitHub repo connected live, showing actual analyzed commits
- [ ] At least one ticket with a visible Confidence Score + Evidence Ledger
- [ ] One Claimed vs Shipped mismatch flag, shown as a question
- [ ] One auto-drafted standup update generated from real commits

## Environment variables

See [.env.example](.env.example) for the full list. What matters for the
demo: `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` / `GITHUB_WEBHOOK_SECRET`,
`ANTHROPIC_API_KEY`, `DATABASE_URL`, and a real `JWT_SECRET` (32+ bytes —
the dev default logs an `InsecureKeyLengthWarning` on purpose). For the
Phase 2/3 features: `SLACK_BOT_TOKEN`/`SLACK_SIGNING_SECRET` (digests, Repo
Chat in Slack), `RESEND_API_KEY` (email digests, and invite/password-reset
emails), `OIDC_*` (SSO — see below), `STRIPE_*` (billing — see below),
`SENTRY_DSN` (optional; the Super-Admin error/metrics panels work without it).

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

Two levels (v3): the process-global `OIDC_ISSUER` / `OIDC_CLIENT_ID` /
`OIDC_CLIENT_SECRET` / `OIDC_REDIRECT_URL` env vars are the fallback for a
single-tenant/self-hosted deployment; a per-workspace `WorkspaceSSOConfig`
row (set via `PUT /sso-config`, WORKSPACE_ADMIN-only) overrides them for one
Enterprise workspace on a shared deployment — pass `?workspace=<account_login>`
to `/auth/sso/login` to use it. Both paths run a real Authorization Code +
PKCE flow against any standard OIDC provider (Okta, Azure AD, Google
Workspace, OneLogin, ...) and were verified to fail cleanly (`501`, not a
crash) when unconfigured — neither has run against a live customer IdP,
since none is available in this environment. SCIM 2.0 user provisioning
(`/scim/v2/Users`, bearer-authenticated by a per-workspace token from
`POST /sso-config/rotate-scim-token`) *was* fully verified end-to-end in
this environment — list/create/get/PATCH-deactivate/delete all round-trip
against a real `User` row — since it needs no external IdP to test, only a
bearer token this codebase itself issues.

### Billing (Stripe)

`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID_{TEAM,GROWTH,AGENCY}`
enable real Checkout Session creation, the Customer Portal, and a webhook
handler covering `checkout.session.completed`, subscription created/updated/
deleted, and `invoice.payment_failed` — syncing the `Subscription` record and
the denormalized `Workspace.plan_tier`/`mrr` used everywhere else. The
integration code is correct against the actual Stripe Python SDK (verified
by inspecting the installed SDK's real parameter types, not from memory) and
was exercised for everything that doesn't need live keys: role gating, a
clean `503` when unconfigured, webhook signature rejection on a forged
payload, and — the part that needed no Stripe account at all — the
`FeatureFlag` gating pipeline itself (`require_feature_flag`), verified live
including a Super-Admin toggle propagating to a real user's access in the
same request cycle.

## What's genuinely verified vs. what needs real credentials

Everything backed by the database was exercised against a real running
Postgres instance during development, including the failure paths (e.g. a
report generation attempt without `ANTHROPIC_API_KEY` correctly lands in a
`failed` state with no fabricated content, never a fake summary) and,
throughout v3, deliberately-seeded real test data (commits, PRs, tickets)
used to check every computed number by hand before deleting it again. That
covers: Confidence Scores, reconciliation, drift/orphan/anomaly/blocker
detection, the confidence-weighted burndown, ROI math, the full JWT/RBAC
auth flow (login, refresh rotation, logout revocation, invite, password
reset), the Super-Admin Dashboard's 8 panels, SCIM provisioning, and every
Phase 2/3 competitor-parity feature (DORA, code health, risk radar, team
goals, PR AutoRoute, delivery forecast, cost capitalization, value stream
view, pulse surveys, working agreements).

What hasn't run against real external services in this environment, because
doing so needs credentials only you can provide:

- GitHub App webhooks (needs a registered GitHub App + a real repo)
- Slack digest delivery and the `/verisprint` slash command (needs a Slack app)
- Resend email digests, invites, and password-reset emails (needs a Resend API key)
- SSO login itself, at either level (needs a real customer identity provider — SCIM provisioning *is* verified, see above)
- Stripe Checkout/Portal/webhooks against a live account (see above — the code path and the FeatureFlag gating it feeds are verified; live payment flows are not)
- The self-hosted/on-prem LLM path (needs an actual vLLM/Ollama/etc. server running)
- Jira/Linear ticket sync (manual ticket entry works without it)
- Sentry error reporting (the DB-backed ErrorEvent/SystemMetric pipeline that actually powers the Super-Admin Dashboard works without it)

## Dev database test accounts

Left in place from verification (all in the demo workspace unless noted;
harmless to delete, kept for convenience): `superadmin@verisprint.dev`
(super_admin, no workspace), `wsadmin@example.com` (workspace_admin),
`dev2@example.com` (manager), `smoketest@example.com` (developer, no
workspace), `clientuser@example.com` (client, no workspace). Password for
each is printed in this repo's git history / session notes, not committed
here — reset via `POST /auth/request-password-reset` if lost. All Phase 2/3
`FeatureFlag`s default to `enabled_globally: false`; toggle from
`/admin` → Flags to see their panels on `/insights`.
