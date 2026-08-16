# Phase 2 / Phase 3 / Enterprise — Implementation Notes

_Source: VeriSprint Master Spec v2 — Sections 4 (PRD, Phase 2/3), 5 (New Advanced Features), 9 (Pricing tiers)._

This is the follow-up build on top of the Phase 1 MVP (see
[BUILD_BRIEF.md](BUILD_BRIEF.md)): every feature listed in the spec's Phase 2
("Early paid tier"), Phase 3 ("Growth / expansion"), and Section 5 ("New
Advanced Features") tables, implemented as real application code against the
existing data model — no mock data, no hardcoded responses. Every generated
report, score, and flag is computed from rows actually in Postgres.

## What "real" means here, concretely

- **Confidence-weighted burndown**: computed from `ConfidenceScore.computed_at`
  history — no interpolated or synthetic points, and never projects into days
  that haven't happened yet.
- **ROI / time-saved calculator**: sums real `StandupUpdate` rows × a
  configured meeting length. `dollars_saved` is `null` until you explicitly
  set an hourly rate in Settings — it never guesses a number.
- **Ticket Drift Detector / Anomaly nudges**: the anomaly detector is pure
  statistics on real commit timestamps (no LLM call at all); the drift
  detector's LLM call is instructed to be conservative and is grounded only
  in the ticket's stored acceptance criteria + its actual EvidenceItems.
- **Reports** (sprint rollup, investor update, client portal, onboarding
  doc): every one is drafted from a context string built entirely out of
  real `Commit`/`EvidenceItem`/`ConfidenceScore`/`Ticket` rows (and, for the
  onboarding doc, the repo's real file tree fetched live from GitHub). A
  failed generation (e.g. missing API key) lands the report in a `failed`
  status with empty `summary_text` — never a fabricated fallback.
- **Client Portal**: the public `share_token` link is minted the moment the
  report is *requested*, not on successful generation — so the link never
  goes dead if a generation attempt fails; the portal page just shows
  "still being prepared" or the honest failure state at the same URL.

## Feature-by-feature

### Phase 2 — Early paid tier

| Feature | Where |
|---|---|
| AI Repo Chat | `app/integrations/llm_client.py::answer_repo_chat_question`, `app/routers/chat.py`, `apps/web/src/app/chat` |
| Sprint rollup report | `app/workers/reports.py::generate_sprint_rollup` |
| Slack/email digests | `app/workers/digest.py`, `app/integrations/email_client.py`, daily cron in `app/queue/worker.py` |
| Historical accuracy score | `app/routers/accuracy.py` |
| Ticket Drift Detector | `app/workers/drift.py` |
| Orphan Commit Detector | `app/workers/orphans.py`, `app/routers/orphans.py` |
| Cross-file impact map | `GET /tickets/{id}/impact-map` in `app/routers/tickets.py` |

### Phase 3 — Growth / expansion

| Feature | Where |
|---|---|
| Client Proof-of-Work Portal | `app/routers/client_portal.py` (public), `app/workers/reports.py::generate_client_portal_report` |
| Investor Update Generator | `app/workers/reports.py::generate_investor_update` |
| Confidence-Weighted Burndown | `app/routers/sprints.py::get_burndown` |
| Onboarding Doc Generator | `app/workers/reports.py::generate_onboarding_doc`, `app/integrations/github_client.py::fetch_repo_tree` |
| Async Standup Replacement + ROI Calculator | `app/routers/roi.py` |
| Anomaly check-in nudges | `app/workers/anomaly.py` |
| Multi-repo / monorepo intelligence | `app/routers/work_units.py` |
| Private/On-prem LLM option | `app/integrations/llm_client.py` (provider dispatch) |
| Compliance & audit trail mode | `app/audit.py`, `app/routers/audit.py` |
| SSO (Enterprise) | `app/integrations/sso_client.py`, `app/routers/sso.py` |

## Data model additions

On top of the Phase 1 schema: `WorkspaceSettings` (branding + ROI inputs),
`ChatQuery` (Repo Chat log), `Sprint`, `ReportDocument`, `AuditLogEntry`, plus
`Ticket.acceptance_criteria`, `Repo.slack_channel_id`, `User.sso_subject`/`sso_provider`,
and a generalized `ReconciliationFlag` (now scoped by ticket, repo, *or*
person — matching the spec's data model note "ticket_id or person_id" — with
three new flag types: `ticket_drift`, `orphan_commit`, `anomaly_activity_drop`).

One infrastructure fix worth calling out: all timestamp columns were changed
to timezone-aware (`TIMESTAMPTZ`) partway through this build — the original
MVP schema used naive timestamps, which broke the moment a client-supplied
period (sprints, ROI, reports) was compared against them. Caught and fixed
via a real migration (`alembic/versions/cb93aae0f6d5_*.py`), verified against
the live database, not left as a latent bug.

## What's out of scope / explicitly not attempted here

- **SOC 2 certification** — that's an external audit process, not something
  to implement. The audit-trail *feature* that a SOC 2 process would want to
  see is implemented (`app/audit.py`).
- **Multi-tenant `Workspace`-per-customer isolation** — the spec's data model
  includes a top-level `Workspace` entity; this build stayed single-tenant
  (one deployment per customer) per the scope decision made at the start of
  this pass. `WorkspaceSettings` here is a single-row config table, not a
  multi-tenant boundary.
- **Actually hosting an on-prem LLM** — the code supports pointing at one;
  standing up a vLLM/Ollama instance is infrastructure you'd run yourself.
