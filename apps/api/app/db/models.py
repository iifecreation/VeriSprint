"""
Core domain models for VeriSprint.

Maps to the MVP build order in the brief:
  Step 1: Workspace, Repo, User
  Step 2: Commit, PullRequest (+ raw diff pointer into object storage)
  Step 3: EvidenceItem (LLM-derived: tests/TODOs/dead code/call graph/summary)
  Step 4: ConfidenceScore (aggregated per ticket)
  Step 5: Ticket, ReconciliationFlag (claimed vs. shipped)
  Step 6: StandupUpdate (auto-drafted, reuses EvidenceItem output)

Plus the v3 "production" additions (spec Sections 6/7/11): multi-tenant
Workspace as the real tenant boundary, User roles/auth fields, and the
operator-facing entities (AuditLogEntry, ErrorEvent, SystemMetric,
Subscription, FeatureFlag, ClientPortalLink).
"""
import enum
import uuid
from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Date,
    Enum,
    Float,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


class UserRole(str, enum.Enum):
    """Spec Section 6 — five roles, least-privilege by default."""

    SUPER_ADMIN = "super_admin"  # internal only, never assigned to a customer — powers the Super-Admin Dashboard
    WORKSPACE_ADMIN = "workspace_admin"  # full control within their own workspace: billing, integrations, users
    MANAGER = "manager"  # full read access to dashboards/alerts/reports; cannot manage billing
    DEVELOPER = "developer"  # own Evidence Ledger + standup drafts; read-only team dashboard
    CLIENT = "client"  # read-only single Client Portal; no dashboards, no raw code


class User(Base):
    """A person with real login access — auth fields live here (see app/auth/)."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    # GitHub OAuth is the primary sign-in path; nullable so an invited
    # email/password or SSO user doesn't need one.
    github_id: Mapped[int | None] = mapped_column(unique=True, index=True)
    github_login: Mapped[str | None] = mapped_column(String(255), index=True)
    name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(1024))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.DEVELOPER, index=True)
    # Nullable: Super Admins aren't scoped to a workspace; a User row created
    # ahead of first login (invite flow) may not have one yet either.
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True)
    slack_user_id: Mapped[str | None] = mapped_column(String(64))
    # Email/password fallback login (spec 6: "email/password as fallback").
    # Null for GitHub-OAuth-only / SSO-only accounts — never a placeholder hash.
    password_hash: Mapped[str | None] = mapped_column(String(255))
    # Bumped to invalidate every outstanding refresh token for this user
    # (password change, role change, manual revoke) without a token blacklist table.
    token_version: Mapped[int] = mapped_column(default=0)
    last_login_at: Mapped[datetime | None]
    # SSO (Enterprise tier): populated on first login via an OIDC identity
    # provider instead of (or alongside) GitHub OAuth / password.
    sso_subject: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    sso_provider: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    workspace: Mapped["Workspace | None"] = relationship(back_populates="users", foreign_keys=[workspace_id])


class WorkspacePlanTier(str, enum.Enum):
    FREE = "free"
    TEAM = "team"
    GROWTH = "growth"
    AGENCY = "agency"
    ENTERPRISE = "enterprise"


class WorkspaceStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELED = "canceled"


class Workspace(Base):
    """
    The tenant boundary (spec Section 11) — one per customer team, one per
    GitHub App installation. Everything else in the schema scopes to a
    workspace, directly or via `Repo.workspace_id`.

    Also carries what used to be the single-row `WorkspaceSettings` config
    (branding + ROI inputs) — now genuinely per-tenant instead of a
    singleton, now that there's more than one tenant.
    """

    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(255))
    github_installation_id: Mapped[int] = mapped_column(unique=True, index=True)
    account_login: Mapped[str] = mapped_column(String(255))
    installed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", use_alter=True))
    plan_tier: Mapped[WorkspacePlanTier] = mapped_column(Enum(WorkspacePlanTier), default=WorkspacePlanTier.FREE)
    status: Mapped[WorkspaceStatus] = mapped_column(Enum(WorkspaceStatus), default=WorkspaceStatus.ACTIVE)
    # Denormalized current MRR for fast Super-Admin queries — Subscription
    # rows below are the source of truth on any billing-event write.
    mrr: Mapped[float] = mapped_column(Float, default=0.0)
    # Client Portal white-label branding.
    logo_url: Mapped[str | None] = mapped_column(String(1024))
    primary_color_hex: Mapped[str] = mapped_column(String(7), default="#111827")
    # ROI calculator inputs — hourly_rate_usd never defaults; see routers/roi.py.
    avg_standup_minutes: Mapped[int] = mapped_column(default=15)
    hourly_rate_usd: Mapped[float | None] = mapped_column(Float)
    # A real, random per-workspace bearer token for the MCP server (see
    # app/mcp_server.py) — an external MCP client (Claude Desktop, Cursor,
    # etc.) authenticates a tool call with this, same rotate-not-recover
    # discipline as WorkspaceSSOConfig.scim_token. Null until generated.
    mcp_token: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    # Set once, at creation (see app/routers/github_app.py::_handle_installation_created)
    # to created_at + 2 days — never extended automatically. A workspace's
    # real, effective access is `app.billing_access.workspace_has_active_access`,
    # which also honors `plan_tier != FREE` (a real paid plan); this column
    # alone is just the trial clock.
    trial_ends_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    repos: Mapped[list["Repo"]] = relationship(back_populates="workspace")
    users: Mapped[list["User"]] = relationship(back_populates="workspace", foreign_keys="User.workspace_id")


class Repo(Base):
    """A GitHub repository selected for ingestion. Read-only access, MVP scope."""

    __tablename__ = "repos"
    __table_args__ = (UniqueConstraint("workspace_id", "github_repo_id"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    github_repo_id: Mapped[int] = mapped_column(index=True)
    full_name: Mapped[str] = mapped_column(String(512))  # e.g. "org/repo"
    default_branch: Mapped[str] = mapped_column(String(255), default="main")
    is_active: Mapped[bool] = mapped_column(default=True)
    # Set via PATCH /repos/{id} — when present, the daily digest cron job
    # posts here. Left unset, no Slack digest is sent for this repo (we never
    # guess a channel).
    slack_channel_id: Mapped[str | None] = mapped_column(String(64))
    # Set via PATCH /repos/{id} (Phase 7 Service segmentation) — which named
    # Service this repo's code belongs to, if any. Null means "ungrouped,"
    # not an error; most workspaces won't bother grouping a single repo.
    service_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("services.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    workspace: Mapped[Workspace] = relationship(back_populates="repos")
    commits: Mapped[list["Commit"]] = relationship(back_populates="repo")
    pull_requests: Mapped[list["PullRequest"]] = relationship(back_populates="repo")


class PullRequest(Base):
    """A GitHub pull request tracked for a repo."""

    __tablename__ = "pull_requests"
    __table_args__ = (UniqueConstraint("repo_id", "number"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repos.id"), index=True)
    number: Mapped[int]
    title: Mapped[str] = mapped_column(Text)
    author_github_login: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(32))  # open | closed | merged
    merged_at: Mapped[datetime | None]
    opened_at: Mapped[datetime]
    # Set on the `closed` webhook action regardless of merge outcome — lets a
    # closed-without-merge PR be told apart from one that's still open,
    # without overloading `merged_at`.
    closed_at: Mapped[datetime | None]
    body: Mapped[str | None] = mapped_column(Text)
    linked_ticket_key: Mapped[str | None] = mapped_column(String(64), index=True)
    # PR-size fields (Phase 3 Git Efficiency Metrics): read directly off
    # GitHub's own `pull_request` webhook payload — not derived by summing
    # synthetic Commit rows, which only exist for the pipeline's own
    # evidence-analysis purposes and don't carry a complete diff stat.
    additions: Mapped[int] = mapped_column(default=0)
    deletions: Mapped[int] = mapped_column(default=0)
    changed_files: Mapped[int] = mapped_column(default=0)
    # First time GitHub told us a reviewer was requested on this PR (the
    # `pull_request` webhook's `review_requested` action carries no event
    # timestamp of its own, so this is "when our webhook received it" —
    # close enough for a Pickup Time metric, not claimed to be exact to the
    # second). Null until a reviewer has ever been requested.
    first_review_requested_at: Mapped[datetime | None]
    # The commit GitHub actually merged into the base branch — the join key
    # for matching this PR to the Deployment that shipped it (Deploy Time).
    # Null for PRs closed without merging, and for PRs ingested before this
    # field existed (merge_commit_sha isn't backfilled).
    merge_commit_sha: Mapped[str | None] = mapped_column(String(40))
    # PR Workflow Automation bookkeeping (Phase 4 competitor-parity — see
    # app/pr_policy.py, app/workers/pr_policy.py). Idempotency, not a cache:
    # labels/reviewers already recorded here are never re-sent to GitHub, and
    # `policy_auto_approved_sha` ties an auto-approval to the exact head
    # commit it was granted for — a new push (new sha) is never silently
    # treated as still-approved.
    policy_labels_applied: Mapped[list[str]] = mapped_column(JSON, default=list)
    policy_reviewers_requested: Mapped[list[str]] = mapped_column(JSON, default=list)
    policy_auto_approved_sha: Mapped[str | None] = mapped_column(String(40))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    repo: Mapped[Repo] = relationship(back_populates="pull_requests")
    commits: Mapped[list["Commit"]] = relationship(back_populates="pull_request")
    reviews: Mapped[list["PullRequestReview"]] = relationship(back_populates="pull_request", order_by="PullRequestReview.submitted_at")


class Commit(Base):
    """A single commit's ingested diff + metadata."""

    __tablename__ = "commits"
    __table_args__ = (UniqueConstraint("repo_id", "sha"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repos.id"), index=True)
    pull_request_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("pull_requests.id"))
    sha: Mapped[str] = mapped_column(String(40), index=True)
    author_github_login: Mapped[str] = mapped_column(String(255), index=True)
    message: Mapped[str] = mapped_column(Text)
    committed_at: Mapped[datetime]
    # Pointer to the raw diff blob in object storage (OBJECT_STORAGE_BUCKET), not stored in Postgres.
    raw_diff_object_key: Mapped[str] = mapped_column(String(1024))
    files_changed: Mapped[int] = mapped_column(default=0)
    additions: Mapped[int] = mapped_column(default=0)
    deletions: Mapped[int] = mapped_column(default=0)
    # File paths this commit touched (added/modified/removed) — straight off
    # the push webhook payload for push-ingested commits; empty for the
    # synthetic per-PR commit ingest_pull_request creates (that one exists
    # for the evidence-analysis pipeline, not as a source of file-level
    # Rework/Refactor Rate data — see app/metrics.py). Plain JSON list, not a
    # separate table: this never needs to be queried by individual path.
    touched_file_paths: Mapped[list[str]] = mapped_column(JSON, default=list)
    linked_ticket_key: Mapped[str | None] = mapped_column(String(64), index=True)
    # Ingestion/analysis pipeline status for this commit.
    status: Mapped[str] = mapped_column(String(32), default="ingested")
    # queued -> ingested -> analyzed -> failed
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    repo: Mapped[Repo] = relationship(back_populates="commits")
    pull_request: Mapped[PullRequest | None] = relationship(back_populates="commits")
    evidence_items: Mapped[list["EvidenceItem"]] = relationship(back_populates="commit")


class PullRequestReview(Base):
    """
    A single GitHub PR review event (Phase 3 Git Efficiency Metrics), from the
    `pull_request_review` webhook's `submitted` action. Backs PR Pickup Time
    (PR opened -> first review activity), PR Review Time (first review ->
    merge), and Review Depth (reviews/comments per PR) — none of which are
    derivable from PullRequest/Commit alone.
    """

    __tablename__ = "pull_request_reviews"
    __table_args__ = (UniqueConstraint("pull_request_id", "github_review_id"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    pull_request_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pull_requests.id"), index=True)
    github_review_id: Mapped[int]
    reviewer_github_login: Mapped[str] = mapped_column(String(255))
    state: Mapped[str] = mapped_column(String(32))  # approved | changes_requested | commented
    submitted_at: Mapped[datetime]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    pull_request: Mapped[PullRequest] = relationship(back_populates="reviews")


class Deployment(Base):
    """
    A GitHub Deployments API deployment + its terminal status (Phase 3 Git
    Efficiency Metrics), from the `deployment`/`deployment_status` webhooks.
    The real, non-guessed basis for Change Failure Rate and Mean Time to
    Restore — both previously hardcoded null in DORAMetrics (see dora.py) for
    lack of any deployment data. A repo that never uses GitHub Deployments
    (Actions/Releases-based or otherwise) simply never populates this table,
    and CFR/MTTR stay null for it rather than being guessed from PR activity.
    """

    __tablename__ = "deployments"
    __table_args__ = (UniqueConstraint("repo_id", "github_deployment_id"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repos.id"), index=True)
    github_deployment_id: Mapped[int]
    environment: Mapped[str] = mapped_column(String(128), default="production")
    sha: Mapped[str] = mapped_column(String(40), index=True)
    # pending -> success | failure | error (terminal states only count toward CFR/MTTR)
    state: Mapped[str] = mapped_column(String(32), default="pending")
    created_at_gh: Mapped[datetime]
    # Set when `state` first reaches a terminal value — the timestamp CFR/MTTR
    # windowing and restore-time math both key off, not `created_at_gh`.
    resolved_at_gh: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    repo: Mapped[Repo] = relationship()


class EvidenceKind(str, enum.Enum):
    SUMMARY = "summary"
    TEST_ADDED = "test_added"
    TEST_MISSING = "test_missing"
    TODO_FOUND = "todo_found"
    DEAD_CODE = "dead_code"
    CALL_GRAPH_CHANGE = "call_graph_change"
    RISK = "risk"


class EvidenceItem(Base):
    """
    An atomic, LLM-derived fact about a commit/PR: a plain-English summary line,
    a detected test, a TODO, dead code, or a call-graph change. These are the
    building blocks of the Evidence Ledger shown per ticket.
    """

    __tablename__ = "evidence_items"

    id: Mapped[uuid.UUID] = _uuid_pk()
    commit_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("commits.id"), index=True)
    ticket_key: Mapped[str | None] = mapped_column(String(64), index=True)
    kind: Mapped[EvidenceKind] = mapped_column(Enum(EvidenceKind))
    description: Mapped[str] = mapped_column(Text)
    file_path: Mapped[str | None] = mapped_column(String(1024))
    line_range: Mapped[str | None] = mapped_column(String(32))
    # Raw structured payload from the LLM call (citations, snippet, confidence, etc.)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    # Embedding of `description` for Repo Chat semantic retrieval.
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    commit: Mapped[Commit] = relationship(back_populates="evidence_items")


class Ticket(Base):
    """A Jira/Linear ticket, synced via API or entered manually for the demo."""

    __tablename__ = "tickets"
    __table_args__ = (UniqueConstraint("repo_id", "key"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repos.id"), index=True)
    key: Mapped[str] = mapped_column(String(64), index=True)  # e.g. "ENG-123"
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(64))  # todo | in_progress | in_review | done
    assignee_github_login: Mapped[str | None] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(32), default="manual")  # jira | linear | manual
    # What the ticket says should be true when it's done — the baseline the
    # Ticket Drift Detector compares real shipped evidence against.
    acceptance_criteria: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    confidence_scores: Mapped[list["ConfidenceScore"]] = relationship(back_populates="ticket")
    reconciliation_flags: Mapped[list["ReconciliationFlag"]] = relationship(back_populates="ticket")


class ConfidenceScore(Base):
    """
    Aggregated confidence that a ticket's claimed work is actually done,
    computed from its linked commits' EvidenceItems.
    """

    __tablename__ = "confidence_scores"

    id: Mapped[uuid.UUID] = _uuid_pk()
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id"), index=True)
    score: Mapped[int]  # 0-100
    rationale: Mapped[str] = mapped_column(Text)
    # Ordered list of evidence_item IDs (as strings) that most influenced the score.
    evidence_item_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    computed_at: Mapped[datetime] = mapped_column(server_default=func.now())

    ticket: Mapped[Ticket] = relationship(back_populates="confidence_scores")


class ReconciliationFlagType(str, enum.Enum):
    CLAIMED_NOT_SHIPPED = "claimed_not_shipped"  # ticket marked done, no matching commits
    SHIPPED_NOT_CLAIMED = "shipped_not_claimed"  # commits exist, ticket not updated
    LOW_CONFIDENCE = "low_confidence"  # commits exist but evidence is thin/contradictory
    TICKET_DRIFT = "ticket_drift"  # real scope grew/changed vs. acceptance criteria
    ORPHAN_COMMIT = "orphan_commit"  # real work with no linked ticket at all
    ANOMALY_ACTIVITY_DROP = "anomaly_activity_drop"  # person's activity dropped vs. their own baseline
    POSSIBLE_BLOCKER = "possible_blocker"  # ticket sitting in a non-terminal status with no new commits in a while


class ReconciliationFlag(Base):
    """
    A claimed-vs-shipped mismatch, phrased as a question for the standup/dashboard —
    never as an accusation.

    Scoped by *either* a ticket (claimed-vs-shipped, drift, low-confidence) *or*
    a repo/person pair (orphan commits, activity-drop nudges) — per the data
    model's "ticket_id or person_id" note. `ticket_id` is therefore nullable.
    """

    __tablename__ = "reconciliation_flags"

    id: Mapped[uuid.UUID] = _uuid_pk()
    ticket_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tickets.id"), nullable=True, index=True)
    repo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("repos.id"), nullable=True, index=True)
    person_github_login: Mapped[str | None] = mapped_column(String(255), index=True)
    commit_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("commits.id"), nullable=True)
    flag_type: Mapped[ReconciliationFlagType] = mapped_column(Enum(ReconciliationFlagType))
    question: Mapped[str] = mapped_column(Text)  # e.g. "ENG-123 is marked Done — should the tests in ... be added?"
    detail_json: Mapped[dict] = mapped_column(JSON, default=dict)  # e.g. baseline/observed numbers behind the flag
    is_resolved: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    ticket: Mapped[Ticket | None] = relationship(back_populates="reconciliation_flags")


class StandupUpdate(Base):
    """An auto-drafted standup entry for one person, one day, built from their commits."""

    __tablename__ = "standup_updates"
    __table_args__ = (
        UniqueConstraint("author_github_login", "repo_id", "date"),
        Index("ix_standup_repo_date", "repo_id", "date"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repos.id"), index=True)
    author_github_login: Mapped[str] = mapped_column(String(255), index=True)
    date: Mapped[datetime]  # date this update covers
    draft_text: Mapped[str] = mapped_column(Text)
    commit_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    posted_to_slack: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class ChatQuery(Base):
    """Log of every AI Repo Chat interaction, for auditability and improvement."""

    __tablename__ = "chat_queries"

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repos.id"), index=True)
    asked_by: Mapped[str | None] = mapped_column(String(255))
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    cited_evidence_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)


class Sprint(Base):
    """A planned window of ticket work — the basis for sprint rollups and the confidence-weighted burndown."""

    __tablename__ = "sprints"
    __table_args__ = (UniqueConstraint("repo_id", "name"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repos.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    start_date: Mapped[datetime]
    end_date: Mapped[datetime]
    planned_ticket_keys: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class ReportType(str, enum.Enum):
    CLIENT_PORTAL = "client_portal"
    INVESTOR_UPDATE = "investor_update"
    SPRINT_ROLLUP = "sprint_rollup"
    ONBOARDING_DOC = "onboarding_doc"
    # Report Builder: a workspace picks which real sections go in, instead of
    # a fixed template — see `custom_sections` below and
    # app/workers/reports.py's `generate_custom_report`. Deterministically
    # assembled from real rows, no LLM narrative step, unlike the other types.
    CUSTOM = "custom"


class ReportDocument(Base):
    """
    A generated, stakeholder-facing document: sprint rollup, investor update,
    onboarding doc, or a Client Proof-of-Work Portal report. `summary_text` is
    always drafted from real Commit/EvidenceItem/ConfidenceScore rows — the
    generating worker never fabricates activity that isn't in the database.
    """

    __tablename__ = "report_documents"

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("repos.id"), index=True)
    report_type: Mapped[ReportType] = mapped_column(Enum(ReportType), index=True)
    period_start: Mapped[datetime | None]
    period_end: Mapped[datetime | None]
    title: Mapped[str] = mapped_column(String(512))
    summary_text: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="generating")  # generating | ready | failed
    # Set only for CLIENT_PORTAL reports — the unauthenticated, unguessable
    # token a client uses to view their portal without any login sharing.
    share_token: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    # Report Builder only (ReportType.CUSTOM): the ordered list of section
    # keys the workspace picked (e.g. ["shipped_activity", "cost_capitalization"]).
    # Null for every other report type.
    custom_sections: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class AuditLogEntry(Base):
    """
    Compliance & Audit Trail mode: an append-only, timestamped record of every
    meaningful state change — ticket status edits, flags raised/resolved,
    confidence recomputed, standups posted, reports generated, chat queries
    answered. Exportable via GET /audit/export for regulated-industry customers.
    """

    __tablename__ = "audit_log_entries"

    id: Mapped[uuid.UUID] = _uuid_pk()
    repo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("repos.id"), nullable=True, index=True)
    # v3: real actor/tenant references, additive alongside the original
    # display-friendly `actor` string so existing entries stay readable.
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(255))  # github_login, email, or "system" for worker-initiated actions
    action: Mapped[str] = mapped_column(String(128), index=True)  # e.g. "ticket.status_changed"
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str] = mapped_column(String(64))
    before_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)


class ErrorSeverity(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ErrorEvent(Base):
    """
    Feeds the Super-Admin error monitoring panel (spec Section 7): every
    ingestion failure, LLM timeout, failed webhook delivery, and auth error,
    with enough context to jump straight to the affected workspace.
    """

    __tablename__ = "error_events"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(64), index=True)  # ingestion | llm | webhook | auth | billing | api
    severity: Mapped[ErrorSeverity] = mapped_column(Enum(ErrorSeverity), index=True)
    message: Mapped[str] = mapped_column(Text)
    # A correlation id (request id / job id) to look up full context in logs —
    # deliberately not a full stack trace blob stored in the DB.
    stack_ref: Mapped[str | None] = mapped_column(String(255))
    resolved_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)


class SystemMetric(Base):
    """Time-series feeding the Super-Admin system-health panel: uptime/latency, queue depth, LLM cost, webhook status."""

    __tablename__ = "system_metrics"

    id: Mapped[uuid.UUID] = _uuid_pk()
    metric_name: Mapped[str] = mapped_column(String(128), index=True)
    value: Mapped[float] = mapped_column(Float)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspaces.id"), nullable=True, index=True)
    recorded_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)


class SubscriptionStatus(str, enum.Enum):
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"


class Subscription(Base):
    """
    Billing state synced from Stripe webhooks — the detailed record behind
    `Workspace.plan_tier`/`Workspace.mrr` (which stay denormalized for fast
    Super-Admin queries and feature-gating checks).
    """

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), unique=True, index=True)
    plan_tier: Mapped[WorkspacePlanTier] = mapped_column(Enum(WorkspacePlanTier), default=WorkspacePlanTier.FREE)
    status: Mapped[SubscriptionStatus] = mapped_column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIALING)
    mrr: Mapped[float] = mapped_column(Float, default=0.0)
    renewed_at: Mapped[datetime | None]
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    payment_provider_ref: Mapped[str | None] = mapped_column(String(255))
    # Which processor this workspace actually pays through — "stripe" (the
    # original, default) or "paystack" (added for workspaces whose business
    # is based somewhere Stripe can't pay out to, e.g. most of Africa;
    # Paystack is itself a Stripe subsidiary built for exactly that gap).
    # A workspace has at most one active provider at a time — switching
    # providers means canceling and re-subscribing, not a dual-bill state.
    payment_provider: Mapped[str] = mapped_column(String(20), default="stripe")
    paystack_customer_code: Mapped[str | None] = mapped_column(String(255), index=True)
    paystack_subscription_code: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class FeatureFlag(Base):
    """Per-workspace/per-plan rollout control (spec Section 7) — a kill-switch for any Phase 2/3 feature."""

    __tablename__ = "feature_flags"

    id: Mapped[uuid.UUID] = _uuid_pk()
    key: Mapped[str] = mapped_column(String(128), unique=True, index=True)  # e.g. "dora_panel", "risk_radar"
    description: Mapped[str | None] = mapped_column(Text)
    enabled_globally: Mapped[bool] = mapped_column(default=False)
    enabled_workspace_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Convenience gate: auto-enabled for workspaces at or above this plan tier
    # (in WorkspacePlanTier order), independent of the explicit allowlist above.
    min_plan_tier: Mapped[WorkspacePlanTier | None] = mapped_column(Enum(WorkspacePlanTier), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class ClientPortalLink(Base):
    """
    Scoped, revocable access to one Client Proof-of-Work Portal report (spec
    Section 6/11) — the production replacement for a bare `share_token` on
    the report itself, since a link needs to expire and revoke independently
    of the report it points to.
    """

    __tablename__ = "client_portal_links"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    report_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("report_documents.id"), index=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime | None]
    revoked: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class TeamGoal(Base):
    """
    Team Goals & Targets (Phase 2 competitor-parity, OKR cascade added in
    Phase 3): a target on a metric VeriSprint already computes for real (avg
    Confidence Score, reconciliation accuracy, etc.) — progress is always
    read live from that metric, never a manually-updated percentage.

    `repo_id is None` is this goal's existing "org-level" signal (workspace-
    wide, not scoped to one repo); `parent_goal_id` additionally lets a
    repo-scoped "team" goal (a Key Result) point back at the org-level
    Objective it cascades from, for roll-up display — see
    app/routers/goals.py and app/goals.py (direction-aware progress/breach
    logic) and app/workers/goal_alerts.py (breach alerting).
    """

    __tablename__ = "team_goals"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    repo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("repos.id"), nullable=True, index=True)
    # Self-referential — null for a top-level (typically org) goal, set for a
    # goal that cascades from another. Not enforced to be a different scope
    # than its parent; that's a UI/process convention, not a DB constraint.
    parent_goal_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("team_goals.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    # One of the metric keys app/goals.py knows how to compute live — see
    # GOAL_METRIC_COMPUTERS there. Kept as a plain string (not an enum) so new
    # metric keys don't need a migration to add.
    metric_key: Mapped[str] = mapped_column(String(64))
    target_value: Mapped[float] = mapped_column(Float)
    period_start: Mapped[datetime]
    period_end: Mapped[datetime]
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    # Set by app/workers/goal_alerts.py the last time this goal was flagged
    # as breaching and an alert was actually sent — both an audit trail and
    # the throttle that keeps the daily cron from re-sending the same alert
    # every run.
    last_alert_sent_at: Mapped[datetime | None]


class IntegrationStatus(str, enum.Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class Integration(Base):
    """
    Open Integration Framework scaffolding (Phase 2 competitor-parity): a
    per-workspace registry of configured integrations beyond the ones with
    dedicated first-class support (GitHub, Slack, Jira/Linear ticket sync).
    `config_json` never stores secrets in plaintext-visible API responses —
    see app/integrations_registry.py's redaction on read.
    """

    __tablename__ = "integrations"
    __table_args__ = (UniqueConstraint("workspace_id", "provider"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    provider: Mapped[str] = mapped_column(String(64))  # e.g. "linear", "jira", "pagerduty", "datadog"
    status: Mapped[IntegrationStatus] = mapped_column(Enum(IntegrationStatus), default=IntegrationStatus.DISCONNECTED)
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)
    connected_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class TicketStatusChange(Base):
    """
    Value Stream View (Phase 3 competitor-parity): a real transition log,
    written by `tickets.py`'s update endpoint whenever `status` actually
    changes. Time-in-stage is only ever computed from these rows — a ticket
    that predates this table simply has no stage history yet, shown as such
    rather than backfilled with a guess.
    """

    __tablename__ = "ticket_status_changes"

    id: Mapped[uuid.UUID] = _uuid_pk()
    ticket_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tickets.id"), index=True)
    from_status: Mapped[str] = mapped_column(String(64))
    to_status: Mapped[str] = mapped_column(String(64))
    changed_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)


class PulseSurvey(Base):
    """Pulse Surveys & Working Agreements (Phase 3 competitor-parity): a single question sent to a workspace, closed on a real date."""

    __tablename__ = "pulse_surveys"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    question: Mapped[str] = mapped_column(Text)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    closes_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class PulseSurveyResponse(Base):
    """
    One person's response to a PulseSurvey. `user_id` exists only to enforce
    one response per person — every read path aggregates across responses
    and never returns a single response tied back to a person, so results
    are genuinely anonymous to anyone consuming the API.
    """

    __tablename__ = "pulse_survey_responses"
    __table_args__ = (UniqueConstraint("survey_id", "user_id"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    survey_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pulse_surveys.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    score: Mapped[int]  # 1-5
    comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class WorkingAgreement(Base):
    """A team-authored, versioned working agreement (Phase 3 competitor-parity) — real text a workspace wrote, never LLM-generated on its behalf."""

    __tablename__ = "working_agreements"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    repo_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("repos.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    body_markdown: Mapped[str] = mapped_column(Text)
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class WorkspaceSSOConfig(Base):
    """
    Per-workspace OIDC SSO config (Phase 3 competitor-parity extension of spec
    Section 5.11's SSO): the process-global OIDC_* env vars remain the
    fallback for a single-tenant/self-hosted deployment; a row here overrides
    them for that one workspace on a shared/multi-tenant deployment. SAML is
    not implemented — this extends the existing OIDC path to be per-workspace,
    it does not add a second protocol.
    """

    __tablename__ = "workspace_sso_configs"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), unique=True, index=True)
    issuer: Mapped[str] = mapped_column(String(512))
    client_id: Mapped[str] = mapped_column(String(255))
    client_secret: Mapped[str] = mapped_column(String(255))
    enabled: Mapped[bool] = mapped_column(default=True)
    # A real, random per-workspace bearer token for SCIM provisioning requests
    # (Phase 3: "SSO/SAML+SCIM extension") — rotate via the settings endpoint,
    # never returned again after creation except on explicit rotation.
    scim_token: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class ContactMessage(Base):
    """
    A real submission from the public marketing site's Contact page — not
    tied to any workspace (the sender isn't a VeriSprint user yet, that's
    the point of the form). Surfaces in the Super-Admin Dashboard so a real
    person sees it, and best-effort emails the internal team the moment it
    arrives — see `POST /contact`.
    """

    __tablename__ = "contact_messages"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), index=True)
    reason: Mapped[str] = mapped_column(String(64))  # enterprise | security | bug_report | other
    message: Mapped[str] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)


class AIToolSubscription(Base):
    """
    A workspace's own AI coding tool spend — GitHub Copilot, Cursor, Claude
    Code, Windsurf, etc. — entered by the workspace, not inferred. This is
    deliberately scoped to a workspace's own subscriptions and never makes a
    comparative claim about any vendor's product; it exists to sit next to
    the AI Contribution Tracker's adoption percentage (app/routers/contributions.py)
    and Cost Capitalization (app/routers/capitalization.py) so a workspace can
    see what it's paying for AI tooling next to what it's measurably getting
    from it — see `GET /ai-tool-costs/report`.
    """

    __tablename__ = "ai_tool_subscriptions"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    tool_name: Mapped[str] = mapped_column(String(120))
    seat_count: Mapped[int] = mapped_column(default=1)
    cost_per_seat_usd: Mapped[float] = mapped_column(Float)
    billing_period: Mapped[str] = mapped_column(String(16))  # monthly | annual
    started_on: Mapped[date] = mapped_column(Date)
    ended_on: Mapped[date | None] = mapped_column(Date, nullable=True)  # null = still active
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class PricingPlan(Base):
    """
    The live, admin-editable price for one self-serve WorkspacePlanTier
    (team/growth/agency — FREE and ENTERPRISE are never sold through
    Checkout, see app/routers/billing.py). This table is the single source
    of truth for "how much does this tier cost" — `apps/marketing`'s pricing
    page and the Checkout flow both read it live, and a Super Admin edit
    here is what should ever change a price, never a manual edit to a
    provider's dashboard or an env var redeploy.

    Editing `price_usd` does not mutate a provider's existing Price/Plan
    object in place — Stripe Prices are immutable by design, and even where
    a provider allows in-place edits (Paystack does), silently reprising an
    object a currently-subscribed customer is already attached to would
    change what they're charged without their consent. Instead, saving a
    new price creates a *new* provider-side Price/Plan and repoints
    `stripe_price_id`/`paystack_plan_code` at it — new Checkout sessions use
    the new price; existing subscriptions keep their original price until
    that customer changes plans through the Billing Portal.
    """

    __tablename__ = "pricing_plans"

    id: Mapped[uuid.UUID] = _uuid_pk()
    tier: Mapped[WorkspacePlanTier] = mapped_column(Enum(WorkspacePlanTier), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    price_usd: Mapped[float] = mapped_column(Float)
    billing_interval: Mapped[str] = mapped_column(String(16), default="month")  # month | year
    is_active: Mapped[bool] = mapped_column(default=True)
    # Provider-side objects auto-created/rotated by app/routers/pricing.py
    # whenever price_usd changes — never hand-entered.
    stripe_price_id: Mapped[str | None] = mapped_column(String(255))
    paystack_plan_code: Mapped[str | None] = mapped_column(String(255))
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class Service(Base):
    """
    Data segmentation (Phase 7 competitor-parity): a named multi-repo
    grouping — "which repos make up this logical service" — the Repo
    dimension every panel already filters by, extended to span more than one
    repo at a time. A repo belongs to at most one Service (`Repo.service_id`);
    there's no many-to-many here because a repo being one team's one
    service's code is the common case this is built for, not a repo shared
    across services.
    """

    __tablename__ = "services"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Team(Base):
    """
    Data segmentation (Phase 7 competitor-parity): a named group of GitHub
    logins — the People dimension (see app/metrics.py's `authors` filter)
    extended to a whole team at once instead of one person at a time. Plain
    JSON list of logins, not a join table to `User` rows: most GitHub
    contributors a workspace wants to group were never required to create a
    VeriSprint account (same reasoning as Sprint.planned_ticket_keys being a
    plain list rather than a join table).
    """

    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = _uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    member_github_logins: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
