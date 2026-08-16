# VeriSprint — Build Brief for Engineering

_Source: VeriSprint Master Spec v2, page 18._

This section is written to be handed directly to an engineering agent (e.g. Claude Code) to scaffold and build
toward a demoable MVP.

## Recommended stack

- **Frontend:** Next.js + React + Tailwind, deployed on Vercel for fastest iteration.
- **Backend/API:** Node.js (TypeScript) or Python (FastAPI) — pick one consistently for the whole
  ingestion + API layer.
- **Database:** Postgres (managed, e.g. Supabase/Neon/RDS) for structured data; pgvector or a managed
  vector DB for retrieval.
- **Queue:** Managed queue (SQS or a hosted Redis-based queue like BullMQ) for ingestion jobs.
- **LLM:** Claude API for diff analysis, Evidence Ledger generation, and Repo Chat query answering.
- **Auth:** GitHub OAuth for login; GitHub App install flow for repo access (read-only scopes only for MVP).
- **Notifications:** Slack app (Bolt SDK) for digests and Repo Chat; Resend/Postmark for email digests.

## MVP build order (map to Phase 1 features in Section 4)

- **Step 1:** GitHub App install + OAuth; pull commit/PR history for selected repos into Postgres.
- **Step 2:** Ingestion worker: on webhook, fetch diff + surrounding file context, store raw diff in object
  storage.
- **Step 3:** LLM analysis pipeline: generate plain-English summary + EvidenceItems (tests/TODOs/dead
  code/call graph) per commit/PR.
- **Step 4:** ConfidenceScore engine: aggregate EvidenceItems per ticket into a score + rationale.
- **Step 5:** Ticket sync (Jira/Linear API or manual ticket entry for demo) + reconciliation engine producing
  ReconciliationFlags.
- **Step 6:** Auto-drafted standup generator (reuses Step 3 output, filtered to one person/one day).
- **Step 7:** PM dashboard (claimed vs shipped, confidence scores, flags) and Developer view (same data,
  personal framing).
- **Step 8:** Slack digest delivery for daily/sprint summaries.

## Definition of done for the meeting/demo

- One real GitHub repo connected live, showing actual analyzed commits — not mock data.
- At least one ticket showing a Confidence Score with visible Evidence Ledger (this is the moment that
  sells the product).
- One example of a Claimed vs Shipped mismatch flag, shown as a question, not an accusation.
- One auto-drafted standup update generated from real commits.

## Environment variables to scaffold

`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `DATABASE_URL`,
`VECTOR_DB_URL`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `JIRA_API_TOKEN` (optional for MVP),
`OBJECT_STORAGE_BUCKET`.

---

## Scaffolding decisions made for this repo

The brief left backend language and repo location open — resolved as follows for this scaffold:

- **Backend:** Python (FastAPI), not Node.js — chosen for the LLM/data-pipeline tooling ecosystem.
- **Location:** `personal/verisprint-project`, alongside the unrelated `deepsense` project.
- **Queue:** Redis + [arq](https://arq-docs.helpmanual.io/) locally (async-native, fits FastAPI); swap for
  SQS in production if preferred — the job functions in `apps/api/app/workers/` don't depend on arq specifics
  beyond the `ctx, *args` signature.
- **Vector DB:** pgvector on the same Postgres instance, per the brief's "pgvector or a managed vector DB" option.
