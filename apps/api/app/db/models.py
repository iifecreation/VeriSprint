"""
Core domain models for VeriSprint.

Maps to the MVP build order in the brief:
  Step 1: Installation, Repo, User
  Step 2: Commit, PullRequest (+ raw diff pointer into object storage)
  Step 3: EvidenceItem (LLM-derived: tests/TODOs/dead code/call graph/summary)
  Step 4: ConfidenceScore (aggregated per ticket)
  Step 5: Ticket, ReconciliationFlag (claimed vs. shipped)
  Step 6: StandupUpdate (auto-drafted, reuses EvidenceItem output)
"""
import enum
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
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


class User(Base):
    """A developer or PM, authenticated via GitHub OAuth."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = _uuid_pk()
    github_id: Mapped[int] = mapped_column(unique=True, index=True)
    github_login: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(String(1024))
    role: Mapped[str] = mapped_column(String(32), default="developer")  # developer | pm | admin
    slack_user_id: Mapped[str | None] = mapped_column(String(64))
    # SSO (Section 5.11 / Enterprise tier): populated on first login via an
    # OIDC identity provider instead of (or alongside) GitHub OAuth.
    sso_subject: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    sso_provider: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Installation(Base):
    """A GitHub App installation (one per org/account that installs VeriSprint)."""

    __tablename__ = "installations"

    id: Mapped[uuid.UUID] = _uuid_pk()
    github_installation_id: Mapped[int] = mapped_column(unique=True, index=True)
    account_login: Mapped[str] = mapped_column(String(255))
    installed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    repos: Mapped[list["Repo"]] = relationship(back_populates="installation")


class Repo(Base):
    """A GitHub repository selected for ingestion. Read-only access, MVP scope."""

    __tablename__ = "repos"
    __table_args__ = (UniqueConstraint("installation_id", "github_repo_id"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    installation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("installations.id"))
    github_repo_id: Mapped[int] = mapped_column(index=True)
    full_name: Mapped[str] = mapped_column(String(512))  # e.g. "org/repo"
    default_branch: Mapped[str] = mapped_column(String(255), default="main")
    is_active: Mapped[bool] = mapped_column(default=True)
    # Set via PATCH /repos/{id} — when present, the daily digest cron job
    # posts here. Left unset, no Slack digest is sent for this repo (we never
    # guess a channel).
    slack_channel_id: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    installation: Mapped[Installation] = relationship(back_populates="repos")
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
    body: Mapped[str | None] = mapped_column(Text)
    linked_ticket_key: Mapped[str | None] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    repo: Mapped[Repo] = relationship(back_populates="pull_requests")
    commits: Mapped[list["Commit"]] = relationship(back_populates="pull_request")


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
    linked_ticket_key: Mapped[str | None] = mapped_column(String(64), index=True)
    # Ingestion/analysis pipeline status for this commit.
    status: Mapped[str] = mapped_column(String(32), default="ingested")
    # queued -> ingested -> analyzed -> failed
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    repo: Mapped[Repo] = relationship(back_populates="commits")
    pull_request: Mapped[PullRequest | None] = relationship(back_populates="commits")
    evidence_items: Mapped[list["EvidenceItem"]] = relationship(back_populates="commit")


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


class WorkspaceSettings(Base):
    """
    Single-row configuration for this VeriSprint deployment: white-label
    branding (Client Proof-of-Work Portal), and the inputs the ROI calculator
    needs so it never has to guess a dollar figure. Single-tenant for now —
    see README for the multi-tenant Workspace-per-customer follow-up.
    """

    __tablename__ = "workspace_settings"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(255), default="VeriSprint")
    logo_url: Mapped[str | None] = mapped_column(String(1024))
    primary_color_hex: Mapped[str] = mapped_column(String(7), default="#111827")
    # Inputs for the Async Standup Replacement ROI calculator — both must be
    # explicitly set before any dollar figure is computed; minutes has a
    # documented default, the rate never does (see routers/roi.py).
    avg_standup_minutes: Mapped[int] = mapped_column(default=15)
    hourly_rate_usd: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


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
    actor: Mapped[str] = mapped_column(String(255))  # github_login, or "system" for worker-initiated actions
    action: Mapped[str] = mapped_column(String(128), index=True)  # e.g. "ticket.status_changed"
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str] = mapped_column(String(64))
    before_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)
