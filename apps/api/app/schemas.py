"""Pydantic (API) schemas — request/response shapes, kept separate from ORM models."""
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RepoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    default_branch: str
    is_active: bool
    slack_channel_id: str | None = None
    service_id: uuid.UUID | None = None


class RepoUpdate(BaseModel):
    slack_channel_id: str | None = None
    service_id: uuid.UUID | None = None


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
    acceptance_criteria: str | None = None
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
    custom_sections: list[str] | None = None
    created_at: datetime


class GenerateReportRequest(BaseModel):
    repo_id: uuid.UUID
    title: str | None = None
    period_start: datetime | None = None  # required except for onboarding_doc
    period_end: datetime | None = None  # required except for onboarding_doc
    sprint_id: uuid.UUID | None = None  # required for sprint_rollup


class GenerateCustomReportRequest(BaseModel):
    repo_id: uuid.UUID
    title: str | None = None
    period_start: datetime
    period_end: datetime
    sections: list[str] = Field(min_length=1)


class ReportSectionOption(BaseModel):
    key: str
    label: str
    description: str


class ReportTemplateOption(BaseModel):
    key: str
    label: str
    description: str
    sections: list[str]


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


# --- Auth (spec Section 6) ---------------------------------------------------

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    github_login: str | None
    name: str | None
    avatar_url: str | None
    role: str
    workspace_id: uuid.UUID | None
    last_login_at: datetime | None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str


class SetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=10, max_length=256)


class RequestPasswordResetRequest(BaseModel):
    email: EmailStr


class InviteUserRequest(BaseModel):
    email: EmailStr
    role: str
    name: str | None = None


class ChangeRoleRequest(BaseModel):
    role: str


# --- Super-Admin Dashboard (spec Section 7) -----------------------------------

class AdminWorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    account_login: str
    plan_tier: str
    status: str
    mrr: float
    repo_count: int
    user_count: int
    created_at: datetime


class AdminWorkspaceUpdate(BaseModel):
    status: str | None = None
    plan_tier: str | None = None


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str | None
    github_login: str | None
    name: str | None
    role: str
    workspace_id: uuid.UUID | None
    workspace_name: str | None = None
    last_login_at: datetime | None
    created_at: datetime


class ErrorEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID | None
    source: str
    severity: str
    message: str
    stack_ref: str | None
    resolved_at: datetime | None
    created_at: datetime


class SystemMetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    metric_name: str
    value: float
    workspace_id: uuid.UUID | None
    recorded_at: datetime


class RevenueSummary(BaseModel):
    total_mrr: float
    workspace_count: int
    by_plan_tier: dict[str, float]
    by_status: dict[str, int]


class FeatureFlagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    description: str | None
    enabled_globally: bool
    enabled_workspace_ids: list[str]
    min_plan_tier: str | None
    created_at: datetime
    updated_at: datetime


class FeatureFlagCreate(BaseModel):
    key: str
    description: str | None = None
    enabled_globally: bool = False
    min_plan_tier: str | None = None


class FeatureFlagUpdate(BaseModel):
    description: str | None = None
    enabled_globally: bool | None = None
    enabled_workspace_ids: list[str] | None = None
    min_plan_tier: str | None = None


class AdminOverview(BaseModel):
    workspace_count: int
    active_workspace_count: int
    user_count: int
    total_mrr: float
    open_error_count: int
    unresolved_flag_count: int
    open_contact_message_count: int


# --- Billing (spec Section 7) -------------------------------------------------

class CheckoutRequest(BaseModel):
    plan_tier: str
    success_url: str
    cancel_url: str
    provider: Literal["stripe", "paystack"] = "stripe"


class CheckoutResponse(BaseModel):
    checkout_url: str


class BillingPortalRequest(BaseModel):
    return_url: str


class BillingPortalResponse(BaseModel):
    portal_url: str


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    plan_tier: str
    status: str
    mrr: float
    payment_provider: str
    renewed_at: datetime | None
    created_at: datetime
    # Denormalized from Workspace for the dashboard's trial banner — see
    # app/billing_access.py for the actual access-control logic these two
    # fields describe; this is just a read-friendly summary of it.
    trial_ends_at: datetime | None = None
    has_active_access: bool = True


class PricingPlanOut(BaseModel):
    id: uuid.UUID
    tier: str
    name: str
    price_usd: float
    billing_interval: str
    is_active: bool
    has_stripe_price: bool
    has_paystack_plan: bool
    updated_at: datetime


class PricingPlanUpdate(BaseModel):
    name: str | None = None
    price_usd: float | None = Field(default=None, ge=0)
    billing_interval: Literal["month", "year"] | None = None
    is_active: bool | None = None


class ResolvedFeatureFlags(BaseModel):
    flags: dict[str, bool]


# --- Phase 2 competitor-parity features ---------------------------------------

class DORAMetrics(BaseModel):
    period_start: datetime
    period_end: datetime
    deployed_pr_count: int
    deployment_frequency_per_day: float
    lead_time_for_changes_hours: float | None
    # Real once this workspace's repos send GitHub `deployment_status` events
    # (see app/routers/github_app.py, app/metrics.py) — null until then,
    # never a guessed number derived from PR/commit activity alone.
    change_failure_rate: float | None = None
    mean_time_to_restore_hours: float | None = None
    unavailable_metrics_note: str | None = (
        "Change Failure Rate and Mean Time to Restore require this workspace's repos to use the "
        "GitHub Deployments API — no deployment_status events received yet, so these are null "
        "rather than guessed."
    )


class ChangelogDay(BaseModel):
    day: datetime
    merged_pr_count: int
    commit_count: int
    entries: list[str]


class CodeHealthSignals(BaseModel):
    period_start: datetime
    period_end: datetime
    total_evidence_items: int
    test_added_count: int
    test_missing_count: int
    dead_code_count: int
    todo_count: int
    risk_count: int
    health_score: float | None


class ContributorStat(BaseModel):
    author_github_login: str
    commit_count: int
    ai_assisted_commit_count: int
    ai_assisted_pct: float


class ContributionReport(BaseModel):
    period_start: datetime
    period_end: datetime
    contributors: list[ContributorStat]
    method_note: str = "Detected via self-disclosed AI attribution in commit messages (e.g. Co-Authored-By trailers) — not a behavioral guess."


class AllocationEntry(BaseModel):
    label: str
    commit_count: int
    additions: int
    deletions: int
    pct_of_commits: float


class AllocationReport(BaseModel):
    period_start: datetime
    period_end: datetime
    by_repo: list[AllocationEntry]
    by_person: list[AllocationEntry]


class RiskRadar(BaseModel):
    repo_id: uuid.UUID
    open_flags_by_type: dict[str, int]
    low_confidence_ticket_count: int
    stale_in_progress_ticket_count: int
    risk_score: float


class TeamGoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    repo_id: uuid.UUID | None
    parent_goal_id: uuid.UUID | None
    name: str
    metric_key: str
    direction: Literal["higher_is_better", "lower_is_better", "target_seeking"]
    target_value: float
    period_start: datetime
    period_end: datetime
    current_value: float | None = None
    progress_pct: float | None = None
    is_breaching: bool = False
    last_alert_sent_at: datetime | None = None
    created_at: datetime


class TeamGoalCreate(BaseModel):
    name: str
    repo_id: uuid.UUID | None = None
    parent_goal_id: uuid.UUID | None = None
    metric_key: str
    target_value: float
    period_start: datetime
    period_end: datetime


class IntegrationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    provider: str
    status: str
    connected_at: datetime | None
    created_at: datetime


class IntegrationConnectRequest(BaseModel):
    provider: str
    config: dict = {}


# --- Phase 3 competitor-parity features ---------------------------------------

class ValueStreamStage(BaseModel):
    status: str
    avg_hours: float
    sample_count: int


class ValueStreamReport(BaseModel):
    period_start: datetime
    period_end: datetime
    stages: list[ValueStreamStage]
    tracked_ticket_count: int


class PullRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    repo_id: uuid.UUID
    number: int
    title: str
    author_github_login: str
    state: str
    opened_at: datetime
    merged_at: datetime | None
    linked_ticket_key: str | None
    # PR Workflow Automation bookkeeping (Phase 4) — what VeriSprint has
    # actually done to this PR on GitHub, not a prediction of what it will do.
    policy_labels_applied: list[str] = []
    policy_reviewers_requested: list[str] = []
    policy_auto_approved_sha: str | None = None


class ReviewerSuggestion(BaseModel):
    file_path: str
    suggested_reviewers: list[str]
    basis: str


class PRAutoRouteResult(BaseModel):
    pr_number: int
    suggestions: list[ReviewerSuggestion]
    top_suggested_reviewers: list[str]


class ForecastPoint(BaseModel):
    date: datetime
    projected_confidence_weighted_complete: float


class DeliveryForecast(BaseModel):
    sprint_id: uuid.UUID
    method: str = (
        "Linear projection of the sprint's own confidence-weighted burndown velocity so far — "
        "a real statistical trend line, not a trained ML model."
    )
    current_confidence_weighted_complete: float
    planned_tickets: int
    velocity_per_day: float | None
    projected_completion_date: datetime | None
    projection_note: str | None = None


class CapitalizationEntry(BaseModel):
    category: str  # "capitalizable_new_development" | "non_capitalizable_maintenance"
    ticket_count: int
    commit_count: int
    estimated_hours: float
    estimated_cost_usd: float | None


class CapitalizationReport(BaseModel):
    period_start: datetime
    period_end: datetime
    hourly_rate_usd: float | None
    entries: list[CapitalizationEntry]
    method_note: str = (
        "Tickets are classified by real title/description keywords (bug|fix|hotfix|chore vs. "
        "feature|add|implement); hours are estimated from real commit volume in the period. "
        "Dollar figures stay null until an hourly rate is configured in Settings."
    )


class PulseSurveyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    question: str
    closes_at: datetime | None
    response_count: int = 0
    average_score: float | None = None
    created_at: datetime


class PulseSurveyCreate(BaseModel):
    question: str
    closes_at: datetime | None = None


class PulseSurveyResponseCreate(BaseModel):
    score: int = Field(ge=1, le=5)
    comment: str | None = None


class WorkingAgreementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    repo_id: uuid.UUID | None
    title: str
    body_markdown: str
    created_at: datetime
    updated_at: datetime


class WorkingAgreementUpsert(BaseModel):
    repo_id: uuid.UUID | None = None
    body_markdown: str


class WorkspaceSSOConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    issuer: str
    client_id: str
    enabled: bool
    has_scim_token: bool
    created_at: datetime


class WorkspaceSSOConfigUpsert(BaseModel):
    issuer: str
    client_id: str
    client_secret: str
    enabled: bool = True


CONTACT_REASONS = {"enterprise", "security", "bug_report", "other"}


class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    reason: str = "other"
    message: str = Field(min_length=1, max_length=5000)


class ContactMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    reason: str
    message: str
    resolved_at: datetime | None
    created_at: datetime


class MCPConfigOut(BaseModel):
    has_token: bool


class AIToolSubscriptionCreate(BaseModel):
    tool_name: str = Field(min_length=1, max_length=120)
    seat_count: int = Field(gt=0)
    cost_per_seat_usd: float = Field(ge=0)
    billing_period: Literal["monthly", "annual"]
    started_on: date
    ended_on: date | None = None
    notes: str | None = None


class AIToolSubscriptionUpdate(BaseModel):
    tool_name: str | None = Field(default=None, min_length=1, max_length=120)
    seat_count: int | None = Field(default=None, gt=0)
    cost_per_seat_usd: float | None = Field(default=None, ge=0)
    billing_period: Literal["monthly", "annual"] | None = None
    started_on: date | None = None
    ended_on: date | None = None
    notes: str | None = None


class AIToolSubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    tool_name: str
    seat_count: int
    cost_per_seat_usd: float
    billing_period: str
    started_on: date
    ended_on: date | None
    notes: str | None
    created_at: datetime
    # Derived, not stored — every subscription's cost normalized to a
    # monthly figure (annual / 12) so mixed billing periods can be summed.
    monthly_cost_usd: float
    is_active: bool


class AIToolCostReportEntry(BaseModel):
    tool_name: str
    seat_count: int
    monthly_cost_usd: float


class AIToolCostReport(BaseModel):
    total_monthly_cost_usd: float
    active_subscription_count: int
    entries: list[AIToolCostReportEntry]
    subscriptions: list[AIToolSubscriptionOut]
    # Present only when a repo_id is passed — cross-references spend against
    # the AI Contribution Tracker's real, self-disclosed adoption signal for
    # that repo (app/routers/contributions.py), never a comparative claim
    # about any vendor's tool.
    repo_ai_assisted_pct: float | None = None
    cost_per_adoption_point_usd: float | None = None
    method_note: str = (
        "Spend is exactly what you entered, normalized to a monthly figure for mixed billing periods. "
        "Adoption is the AI Contribution Tracker's self-disclosed percentage for the selected repo — "
        "not a productivity or quality claim, and not a comparison between tools."
    )


# --- Git Efficiency & Quality Metrics (Phase 3 competitor-parity) -------------

class BenchmarkedValue(BaseModel):
    value: float | None
    band: Literal["elite", "good", "fair", "needs_focus"] | None = None
    unit: str = ""


class EfficiencyReport(BaseModel):
    period_start: datetime
    period_end: datetime
    merged_pr_count: int
    coding_time_hours: BenchmarkedValue
    pr_pickup_time_hours: BenchmarkedValue
    pr_review_time_hours: BenchmarkedValue
    deploy_time_hours: BenchmarkedValue
    cycle_time_hours: BenchmarkedValue
    merge_frequency_per_dev_per_week: BenchmarkedValue
    pr_size_lines: BenchmarkedValue
    review_depth_per_pr: float | None
    prs_merged_without_review_pct: float | None
    rework_rate_pct: BenchmarkedValue
    refactor_rate_pct: BenchmarkedValue
    change_failure_rate_pct: BenchmarkedValue
    mttr_hours: BenchmarkedValue
    method_note: str = (
        "Rework Rate and Refactor Rate are file-level/shape-based heuristics, not true git-blame "
        "analysis — see app/metrics.py. Deploy Time, Change Failure Rate, and MTTR are null until "
        "this workspace's repos send GitHub deployment_status events. Benchmark bands (Elite/Good/"
        "Fair/Needs Focus) are a reasonable midpoint of publicly-published industry convention, not "
        "a claim about where your org actually ranks — see app/benchmarks.py."
    )


# --- Investment Profile (Phase 3 competitor-parity) ---------------------------

class InvestmentCategoryEntry(BaseModel):
    category: Literal["new_value", "feature_enhancements", "developer_experience", "keeping_the_lights_on"]
    ticket_count: int
    code_change_lines: int
    pct_of_categorized_lines: float
    target_pct: float


class InvestmentProfileReport(BaseModel):
    period_start: datetime
    period_end: datetime
    categories: list[InvestmentCategoryEntry]
    uncategorized_code_change_lines: int
    uncategorized_pct_of_total: float
    # Reuses the Git Efficiency Metrics panel's Rework Rate (app/metrics.py) as
    # a cross-cutting "wasted effort" lens — null for the same reasons that
    # metric can be null (no push-ingested commits with touched_file_paths in
    # this period), not a separate 5th slice of the categories pie.
    inefficiency_pool_pct: float | None
    method_note: str = (
        "Categories are classified from each linked ticket's title/description against a fixed, "
        "ordered keyword list (first match wins, not configurable yet, not an LLM guess) — see "
        "app/routers/allocation.py. Work with no linked ticket, or whose ticket matches no keyword, "
        "is reported separately as 'uncategorized' rather than guessed into a bucket. Percentages "
        "are of *categorized* code-change volume (additions+deletions) and sum to 100% across the "
        "4 categories; uncategorized volume is reported alongside, not folded in. Inefficiency Pool "
        "reuses the Git Efficiency Metrics panel's Rework Rate heuristic as a cross-cutting measure "
        "— it already lives inside one of the 4 categories above, not a separate slice. Target "
        "percentages are a reasonable midpoint of publicly-published industry convention, not a "
        "claim about where your org should be — see app/benchmarks.py."
    )


# --- Planning & Capacity Accuracy (Phase 5 competitor-parity) -----------------

class DeliveryAccuracyReport(BaseModel):
    sprint_id: uuid.UUID
    planned_ticket_count: int
    planned_completed_count: int
    added_completed_count: int
    total_completed_count: int
    planning_accuracy: BenchmarkedValue
    capacity_accuracy: BenchmarkedValue
    risk_quadrant: Literal["on_track", "capacity_mismatch", "scope_creep", "overcommitted"] | None
    method_note: str = (
        "Planning Accuracy = planned tickets that reached done, within this sprint's window, over all "
        "planned tickets. Capacity Accuracy = ALL tickets (planned + added mid-sprint) that reached done "
        "in-window, over planned tickets — it can be high even when Planning Accuracy is low if unplanned "
        "work displaced planned work (LinearB's 'scope creep' quadrant). Both are null when the sprint had "
        "no planned tickets. A ticket with no TicketStatusChange history (predates that table) still counts "
        "toward Planning Accuracy if it's currently done, but never toward Capacity Accuracy — there's no "
        "timestamp confirming it finished specifically within this window. See app/delivery_risk.py and "
        "app/benchmarks.py's classify_delivery_risk_quadrant."
    )


# --- Team & Service segmentation (Phase 7 competitor-parity) ------------------

class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    created_at: datetime
    repo_ids: list[uuid.UUID] = []


class ServiceCreate(BaseModel):
    name: str


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    member_github_logins: list[str]
    created_at: datetime


class TeamCreate(BaseModel):
    name: str
    member_github_logins: list[str] = []


class TeamUpdate(BaseModel):
    name: str | None = None
    member_github_logins: list[str] | None = None
