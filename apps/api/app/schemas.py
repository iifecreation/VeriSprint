"""Pydantic (API) schemas — request/response shapes, kept separate from ORM models."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RepoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    default_branch: str
    is_active: bool
    slack_channel_id: str | None = None


class RepoUpdate(BaseModel):
    slack_channel_id: str | None = None


class EvidenceItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    commit_id: uuid.UUID
    ticket_key: str | None
    kind: str
    description: str
    file_path: str | None
    line_range: str | None
    created_at: datetime


class ConfidenceScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_id: uuid.UUID
    score: int
    rationale: str
    evidence_item_ids: list[str]
    computed_at: datetime


class ReconciliationFlagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_id: uuid.UUID | None
    repo_id: uuid.UUID | None
    person_github_login: str | None
    commit_id: uuid.UUID | None
    flag_type: str
    question: str
    detail_json: dict
    is_resolved: bool
    created_at: datetime


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    title: str
    status: str
    assignee_github_login: str | None
    confidence: ConfidenceScoreOut | None = None
    flags: list[ReconciliationFlagOut] = []


class TicketCreate(BaseModel):
    repo_id: uuid.UUID
    key: str
    title: str
    description: str | None = None
    status: str
    assignee_github_login: str | None = None
    source: str = "manual"


class StandupUpdateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repo_id: uuid.UUID
    author_github_login: str
    date: datetime
    draft_text: str
    posted_to_slack: bool


class RepoChatQuery(BaseModel):
    repo_id: uuid.UUID
    question: str
    asked_by: str | None = None


class RepoChatAnswer(BaseModel):
    answer: str
    citations: list[EvidenceItemOut]


class ChatQueryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repo_id: uuid.UUID
    asked_by: str | None
    question: str
    answer: str
    cited_evidence_ids: list[str]
    created_at: datetime


class TicketUpdate(BaseModel):
    status: str | None = None
    title: str | None = None
    description: str | None = None
    acceptance_criteria: str | None = None
    assignee_github_login: str | None = None


class SprintCreate(BaseModel):
    repo_id: uuid.UUID
    name: str
    start_date: datetime
    end_date: datetime
    planned_ticket_keys: list[str] = []


class SprintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repo_id: uuid.UUID
    name: str
    start_date: datetime
    end_date: datetime
    planned_ticket_keys: list[str]
    created_at: datetime


class BurndownPoint(BaseModel):
    day: datetime
    planned_tickets: int
    confidence_weighted_complete: float  # sum of (score/100) across planned tickets as of this day
    fully_shipped: int  # tickets with a confidence score >= 75 as of this day


class BurndownOut(BaseModel):
    sprint: SprintOut
    points: list[BurndownPoint]


class ReportDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repo_id: uuid.UUID
    report_type: str
    period_start: datetime | None
    period_end: datetime | None
    title: str
    summary_text: str
    status: str
    share_token: str | None
    created_at: datetime


class GenerateReportRequest(BaseModel):
    repo_id: uuid.UUID
    title: str | None = None
    period_start: datetime | None = None  # required except for onboarding_doc
    period_end: datetime | None = None  # required except for onboarding_doc
    sprint_id: uuid.UUID | None = None  # required for sprint_rollup


class AccuracyPoint(BaseModel):
    month: str  # YYYY-MM
    person_github_login: str
    tickets_completed: int
    tickets_with_unresolved_flags: int
    avg_confidence_score: float | None
    accuracy_pct: float  # % of completed tickets with no unresolved flags and confidence >= 70


class ROISummary(BaseModel):
    period_start: datetime
    period_end: datetime
    team_report_days: int  # distinct (repo, day) with a full team standup generated
    people_covered: int
    avg_standup_minutes: int
    hours_saved: float
    hourly_rate_usd: float | None
    dollars_saved: float | None  # null unless hourly_rate_usd is configured — never fabricated


class OrphanCommitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sha: str
    author_github_login: str
    message: str
    committed_at: datetime
    files_changed: int


class LogicalWorkUnit(BaseModel):
    ticket_key: str
    repo_full_names: list[str]
    commit_count: int
    commit_ids: list[uuid.UUID]
    first_committed_at: datetime
    last_committed_at: datetime


class ImpactMapEntry(BaseModel):
    file_path: str
    evidence_count: int
    kinds: list[str]


class AuditLogEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repo_id: uuid.UUID | None
    actor: str
    action: str
    entity_type: str
    entity_id: str
    before_json: dict | None
    after_json: dict | None
    created_at: datetime


class WorkspaceSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    logo_url: str | None
    primary_color_hex: str
    avg_standup_minutes: int
    hourly_rate_usd: float | None
    updated_at: datetime


class PortalBranding(BaseModel):
    name: str
    logo_url: str | None
    primary_color_hex: str


class PublicPortalReportOut(BaseModel):
    title: str
    status: str
    summary_text: str | None
    period_start: datetime | None
    period_end: datetime | None
    branding: PortalBranding


class WorkspaceSettingsUpdate(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    primary_color_hex: str | None = None
    avg_standup_minutes: int | None = None
    hourly_rate_usd: float | None = None
