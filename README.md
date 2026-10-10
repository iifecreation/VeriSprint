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
- **Auth:** JWT access/refresh tokens (`app/auth/`) with 5-role RBAC — GitHub OAuth (primary) or email/password (fallback) for login, GitHub App install (mostly read-only, plus the Pull requests/Issues *write* scope PR Workflow Automation uses — see below) for repo access, optional per-workspace OIDC SSO + SCIM provisioning for Enterprise
- **Billing:** Stripe Checkout + Customer Portal + webhooks, synced to a `Subscription` record and gated via per-workspace `FeatureFlag`s
- **Observability:** DB-backed `ErrorEvent`/`SystemMetric` pipeline (the Super-Admin Dashboard's real data source) + optional Sentry
- **Notifications:** Slack app (Bolt) + Resend email for daily digests, `/verisprint` Repo Chat

## Project layout

```
apps/
  web/              Next.js frontend (app) — dashboard, dev view, chat,
                     standups, sprints/burndown (+ delivery forecast),
                     insights, analytics (value stream, cost capitalization,
                     investment allocation, visual changelog, AI contribution
                     tracker), reviewers (PR AutoRoute), team (pulse surveys,
                     working agreements), reports, orphan commits, accuracy,
                     ROI, audit log, settings (+ integrations, SSO/SCIM
                     config), public client portal, login/OAuth callback.
                     Shares apps/marketing's design system (sky-gradient/
                     neon-lime/glass-card) as its own copy — no shared
                     package, each app is a fully independent deploy.
  admin/            Next.js operator console — a separate app/deploy from
                     apps/web (own login, own dark "control room" theme,
                     own localStorage token keys) hitting the same backend
                     API. Overview, Workspaces, Users, Errors, Metrics,
                     Revenue, Flags, Audit — super_admin accounts only.
  marketing/        Next.js public marketing site — homepage, features,
                     how it works, pricing, security & trust, docs,
                     changelog, about, contact — a separate app/deploy from
                     apps/web, with no auth or API-mutating calls of its own
  api/              FastAPI backend
    app/
      routers/      ~35 HTTP route modules
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
cp ../../.env.example .env   # NOT ../../.env — Settings() reads ".env" relative to
                              # this process's CWD (apps/api), confirmed empirically;
                              # a .env at the repo root is silently ignored once you
                              # `cd apps/api` to run uvicorn, no error either way.
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

**5. Operator console (`apps/admin`, separate app — `super_admin` only)**

```bash
cd apps/admin
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:58000" > .env.local
echo "NEXT_PUBLIC_APP_URL=http://localhost:53000" >> .env.local
npm run dev -- --port 53200
```

Visit http://localhost:53200 and sign in as `superadmin@verisprint.dev` (see
test accounts below). This is where FeatureFlags get toggled, contact-form
messages and errors get triaged, and cross-tenant workspace/billing state
lives.

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
| **Stakeholder Report Templates** (Leadership Update / Engineering Team Update presets over Report Builder) | `workers/reports.py` (`REPORT_TEMPLATES`), `routers/reports.py` (`/custom/templates`) | `/reports` |
| **People segmentation** (filter Git Efficiency Metrics by GitHub login or Team) | `metrics.py` (`author_logins` param), `routers/efficiency.py` | `/insights` |
| **Team & Service segmentation** (named group of GitHub logins / named multi-repo grouping) | `routers/teams.py`, `routers/services.py`, `auth/dependencies.py` (`get_repo_ids_for_scope`) | `/settings`, `/insights` |
| Confidence-Weighted Burndown (5.7) | `routers/sprints.py` | `/sprints` |
| **Planning & Capacity Accuracy** (2x2 delivery-risk quadrant) | `delivery_risk.py`, `routers/sprints.py` (`/accuracy`) | `/sprints` |
| Onboarding Doc Generator (5.8) | `workers/reports.py` + `integrations/github_client.py` | `/reports` |
| Async Standup Replacement + ROI (5.4) | `routers/roi.py` | `/roi` |
| Anomaly check-in nudges (5.9) | `workers/anomaly.py` | flags on `/dashboard` |
| Multi-repo intelligence (5.10) | `routers/work_units.py` | — (API only) |
| Private/On-Prem LLM (5.11) | `integrations/llm_client.py` (provider dispatch) | — (config only) |
| Compliance & Audit Trail (5.12) | `audit.py`, `routers/audit.py`, `routers/admin.py` (cross-tenant) | `/audit`, `apps/admin` |
| **Auth: JWT + RBAC + email/password fallback** | `app/auth/`, `routers/auth.py` | `/login`, `/auth/callback` |
| **Super-Admin Dashboard (8 panels)** | `routers/admin.py` | `apps/admin` (separate app) |
| **Billing: Stripe + FeatureFlag gating** | `integrations/stripe_client.py`, `routers/billing.py`, `feature_flags.py` | `/insights` (gated panels) |
| **Error/metrics observability** | `observability.py`, global exception handler, `workers/metrics.py` cron | `apps/admin` (Errors, Metrics panels) |
| **Public marketing site (9 pages)** | — | `apps/marketing` (separate app) |
| **DORA Panel** | `routers/dora.py` | `/insights` |
| **Git Efficiency & Quality Metrics** (PR Size, Cycle Time breakdown, Rework/Refactor Rate, Review Depth, benchmark bands) | `routers/efficiency.py`, `metrics.py`, `benchmarks.py` | `/insights` |
| **Investment Profile** (New Value / Feature Enhancements / Developer Experience / Keeping the Lights On, target-vs-actual, Inefficiency Pool) | `routers/allocation.py` (`/profile`), `investment.py` | `/insights` |
| **PR Workflow Automation** (auto-label, auto-assign reviewers, auto-approve narrowly-safe PRs — gitStream-equivalent) | `pr_policy.py`, `workers/pr_policy.py`, `integrations/github_client.py` (write ops) | `/reviewers` (shows what was done) |
| **Blocker Nudge Bot** | `workers/blockers.py` | flags on `/dashboard` (`possible_blocker` flag type) |
| **Team Goals & Targets** (OKR cascade via `parent_goal_id`, direction-aware progress, Slack/email breach alerting) | `goals.py`, `routers/goals.py`, `workers/goal_alerts.py` | `/insights` |
| **Code Health Signals** | `routers/code_health.py` | `/insights` |
| **Visual Changelog** | `routers/changelog.py` | `/analytics` |
| **AI Contribution Tracker** | `routers/contributions.py` | `/analytics` |
| **Investment Allocation Dashboard** | `routers/allocation.py` | `/analytics` |
| **Risk Radar** | `routers/risk.py` | `/insights` |
| **Open Integration Framework (scaffolding)** | `routers/integrations.py` | `/settings` |
| **PR AutoRoute** | `routers/pr_autoroute.py` | `/reviewers` |
| **Pulse Surveys & Working Agreements** | `routers/pulse.py`, `routers/working_agreements.py` | `/team` |
| **Delivery Forecast** (statistical, not ML — see router docstring) | `routers/forecast.py` | `/sprints` (per-sprint panel) |
| **Value Stream View** | `routers/value_stream.py`, `TicketStatusChange` | `/analytics` |
| **Cost Capitalization Report** | `routers/capitalization.py` | `/analytics` |
| **SSO/SCIM extension (per-workspace)** | `routers/sso_config.py`, `routers/scim.py` | `/settings` (SCIM itself is IdP-facing, no UI) |

Every Phase 2/3 feature above now has a dedicated frontend surface — the
last API-only gaps (PR AutoRoute, Value Stream, Cost Capitalization,
Delivery Forecast, Pulse Surveys, Working Agreements, Visual Changelog, AI
Contribution Tracker, Investment Allocation, Open Integration Framework,
SSO/SCIM config) were closed out together with the `apps/admin` split.
Each panel still respects its own `FeatureFlag` — most default off, same as
before, so a fresh workspace sees "not enabled" until a Super Admin turns
one on from `apps/admin` → Flags.

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

### PR Workflow Automation (GitHub write access)

`pr_policy.py` classifies every opened/synchronized PR against a small,
fixed rule set (not a DSL editor) purely from file paths and line counts —
decoupled from the LLM evidence pipeline on purpose, so it works even
without `ANTHROPIC_API_KEY` configured. `workers/pr_policy.py` turns that
classification into real GitHub writes: adding labels (auto-creating them if
the repo doesn't have them yet), requesting reviewers (same file-history
basis as PR AutoRoute, matched against `Commit.touched_file_paths` instead
of EvidenceItem so it doesn't wait on analysis), and — the most
conservatively gated capability — auto-approving PRs that touch *only*
non-functional paths (docs, `.gitignore`, license, changelog, PR/issue
templates) within a small line-count threshold.

Each of the three capabilities is its own `FeatureFlag`, default off,
independent of the GitHub App's own permission grant:
`pr_policy_labeling`, `pr_policy_reviewer_assignment`,
`pr_policy_auto_approve`. This needs the GitHub App's permissions expanded
from read-only to include **Pull requests: write** (review requests,
approvals) and **Issues: write** (labels, which PRs share with issues in
GitHub's API) — a manifest/settings change on GitHub's side, not something
this codebase can flip on its own. Auto-approval adds exactly one approving
review, the same as a human clicking "Approve" — it does not and cannot
bypass a repo's required-review count or branch protection rules, and it's
tied to the exact head commit it was granted for (`policy_auto_approved_sha`)
so a new push is never silently treated as still-approved.

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
view, pulse surveys, working agreements). The Git Efficiency & Quality
Metrics panel's math (PR Size, Cycle Time breakdown, Merge Frequency, Review
Depth, Rework/Refactor Rate heuristics, Change Failure Rate, MTTR) and the
Investment Profile's category classification were both exercised the same
way — real seeded `PullRequest`/`Commit`/`PullRequestReview`/`Deployment`/
`Ticket` rows, every number checked by hand against what was seeded before
deleting it again. The OKR cascade and breach-alerting worker
(`workers/goal_alerts.py`) were run the same way too — a seeded org-level
goal and a cascading team goal, driven through the real direction-aware
progress/breach logic and the actual worker function end-to-end, confirming
both a true breach (flagged, audited, `last_alert_sent_at` set) and a met
goal (correctly never flagged). PR Workflow Automation's classification
logic and the worker's idempotency (same labels/reviewers never re-sent,
same head commit never re-approved) were verified the same way end-to-end
against the real database, with only the GitHub write calls themselves
mocked — there's no live GitHub App installation with write permissions in
this environment to exercise `add_labels`/`request_reviewers`/
`approve_pull_request` against a real repo, see below. Planning & Capacity
Accuracy (`delivery_risk.py`) was verified the same way too — four seeded
sprints, one per named risk posture (on-track, scope creep, overcommitted,
capacity mismatch/under-committed), each driven through the real
`compute_delivery_accuracy` + `classify_delivery_risk_quadrant` end-to-end
and confirmed to land in exactly the expected quadrant. The four new report
sections (`engineering_health`, `investment_profile`, `delivery_risk`,
`goals_progress`) and People segmentation's `author_logins` filter on Git
Efficiency Metrics were each checked the same way against real seeded data,
including confirming the per-person numbers actually differ between two
different authors' PRs rather than silently returning the repo-wide total.

All four of LinearB's data-segmentation dimensions are now real: Repo
(every panel already had it), People (a GitHub login filter on Git
Efficiency Metrics), Team (a named group of GitHub logins — `Team` model,
`routers/teams.py`, resolves to the same `author_logins` filter), and
Service (a named multi-repo grouping — `Service` model,
`Repo.service_id`, `routers/services.py`, resolves to a `repo_ids` list via
`get_repo_ids_for_scope`). Team/Service were verified against real seeded
data too: a Service correctly scoped Efficiency Metrics to its member repos
only (excluding an ungrouped repo in the same workspace), and a Team
correctly scoped metrics to its members' own PRs across multiple repos
(excluding two non-member authors) — both via the actual
`get_repo_ids_for_scope` dependency and `compute_efficiency_metrics`, not a
reimplementation. Team/Service CRUD and repo-to-Service assignment are in
`/settings`; the Team filter is wired into the `/insights` Efficiency panel.
Service-scoped querying (`service_id` as an alternative to `repo_id`) is
live on `/efficiency` and `/allocation/profile` but not yet wired into any
page's UI — an API-only capability for now, same as a few other
already-shipped features document.

What hasn't run against real external services in this environment, because
doing so needs credentials only you can provide:

- GitHub App webhooks (needs a registered GitHub App + a real repo) — note the App's webhook
  subscriptions need `pull_request_review` and `deployment_status` added (alongside
  `push`/`pull_request`/`installation*`) for PR Pickup/Review Time, Deploy Time, Change Failure Rate,
  and MTTR to populate; a repo that never uses the GitHub Deployments API simply never sends
  `deployment_status`, and those metrics stay null rather than guessed
- PR Workflow Automation's actual GitHub writes (needs the App's permissions expanded to Pull
  requests: write + Issues: write, and a real repo with the relevant FeatureFlags on — the
  classification/idempotency logic itself is verified, see above, but `add_labels`/
  `request_reviewers`/`approve_pull_request` have never run against the real GitHub API in this
  environment)
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
here — reset via `POST /auth/request-password-reset` if lost (rate-limited,
see below). All Phase 2/3 `FeatureFlag`s default to `enabled_globally: false`;
toggle from `apps/admin` → Flags to see their panels light up across
`/insights`, `/analytics`, `/reviewers`, `/team`, `/sprints`, and `/settings`.

`/auth/login` and `/auth/request-password-reset` are rate-limited
(`app/auth/rate_limit.py`, Redis-backed fixed window — 10 login attempts /
15 min per email plus 20/5 min per IP; 3 reset requests / hour per email
plus 5/hour per IP) and fail *open* if Redis is unreachable, so a limiter
outage degrades to "unprotected," not "logins are down."

**Getting a working session without a known password:** mint a token pair
directly against the real `app.auth.security` signer instead of resetting a
password — this is how every backend feature in this repo has actually been
exercised locally:

```bash
cd apps/api && source .venv/bin/activate
python - <<'EOF'
import asyncio
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.auth.security import create_token_pair
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == "wsadmin@example.com"))).scalar_one()
        pair = create_token_pair(user_id=user.id, workspace_id=user.workspace_id, role=user.role.value, token_version=user.token_version)
        print("access:", pair["access_token"])
        print("refresh:", pair["refresh_token"])

asyncio.run(main())
EOF
```

Access tokens expire in 15 minutes — swap the email and re-run to mint a
fresh one, or a different role's token. To use one in the browser instead of
curl, set it into the app's own `localStorage` keys from the browser console
(`verisprint_access_token`/`verisprint_refresh_token` for `apps/web`,
`verisprint_admin_access_token`/`verisprint_admin_refresh_token` for
`apps/admin`) and reload.

**`apps/api/tests/` now has a real automated suite** (52 tests, all passing)
covering every Phase 2/3 competitor-parity module that's pure enough to unit
test or DB-backed enough to need one: `compute_efficiency_metrics` (PR size,
cycle time breakdown, rework/refactor, CFR/MTTR, person/team filtering),
`compute_investment_profile` (category classification, keyword priority
order), `compute_delivery_accuracy` + `classify_delivery_risk_quadrant` (all
four risk postures), `compute_progress_pct`/`is_goal_breaching` (every
direction — higher/lower/target-seeking — and the halfway-mark breach rule),
`classify_pull_request` (PR policy labeling/auto-approve rules),
`get_repo_ids_for_scope` (Team/Service segmentation), and the Report
Builder's four Phase 6 sections. Run it with:

```bash
cd apps/api && source .venv/bin/activate && pytest
```

It needs the real dev Postgres running and migrated (`docker-compose up -d`
+ `alembic upgrade head`) — same prerequisite as running the app itself, not
a separate test database; `tests/conftest.py` explains why (a transaction-
rollback fixture was tried first and proved flaky with this driver stack,
so isolation is explicit FK-ordered cleanup instead, verified stable across
repeated runs with zero leftover rows). What it deliberately does *not*
cover: worker entrypoints that open their own DB session rather than
accepting one as a parameter (`apply_pr_policy`, `check_goal_breaches`) —
testing those directly would commit to the real dev database outside the
suite's cleanup; their underlying logic is covered through the pure
functions they call instead.

`apps/web` now has a real test runner too — Vitest + React Testing Library,
set up per this Next.js version's own documented guide
(`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`), covering
`lib/auth.ts`'s real logic (JWT claim decoding, the refresh-token
de-duplication lock, clearing tokens on a failed refresh) and a handful of
shared UI components (`Badge`'s per-tone styling, `StatCard`'s optional
hint, `PageHeader`). Run it with `cd apps/web && npm test`. `apps/admin` and
`apps/marketing` still have no test runner configured — both are smaller
surfaces with comparatively little logic of their own (operator CRUD
screens and static marketing pages, respectively); UI verification there is
still by hand against the dev server.

**CI**: `.github/workflows/api-tests.yml` and `.github/workflows/web-tests.yml`
run on every push to `main` and every PR, path-scoped to their own app so a
frontend-only change doesn't spin up Postgres for nothing (and vice versa).
`api-tests.yml` runs real Postgres + Redis service containers (same image +
credentials as `docker-compose.yml`), migrates, then runs `pytest`.
`web-tests.yml` runs `tsc --noEmit`, `npm test`, and `npm run build` —
catching the class of break the Vitest suite alone wouldn't (a type error or
build failure in one of the many page components Vitest doesn't cover,
which is most of them; this app's actual business logic lives in `apps/api`
by design, see the Stack section above). Neither workflow exists yet for
`apps/admin`/`apps/marketing`, consistent with neither having a local test
runner configured either.
