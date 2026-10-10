import { API_BASE_URL } from "./config";
import { clearTokens, getAccessToken, getRefreshToken, refreshAccessToken } from "./auth";

export type Repo = {
  id: string;
  full_name: string;
  default_branch: string;
  is_active: boolean;
  slack_channel_id: string | null;
};

export type ConfidenceScore = {
  id: string;
  ticket_id: string;
  score: number;
  rationale: string;
  evidence_item_ids: string[];
  computed_at: string;
};

export type FlagType =
  | "claimed_not_shipped"
  | "shipped_not_claimed"
  | "low_confidence"
  | "ticket_drift"
  | "orphan_commit"
  | "anomaly_activity_drop"
  | "possible_blocker";

export type ReconciliationFlag = {
  id: string;
  ticket_id: string | null;
  repo_id: string | null;
  person_github_login: string | null;
  commit_id: string | null;
  flag_type: FlagType;
  question: string;
  detail_json: Record<string, unknown>;
  is_resolved: boolean;
  created_at: string;
};

export type Ticket = {
  id: string;
  key: string;
  title: string;
  status: string;
  assignee_github_login: string | null;
  acceptance_criteria: string | null;
  confidence: ConfidenceScore | null;
  flags: ReconciliationFlag[];
};

export type StandupUpdate = {
  id: string;
  repo_id: string;
  author_github_login: string;
  date: string;
  draft_text: string;
  posted_to_slack: boolean;
};

export type DashboardSummary = {
  ticket_count: number;
  avg_confidence: number | null;
  open_flags: number;
};

export type EvidenceItem = {
  id: string;
  commit_id: string;
  ticket_key: string | null;
  kind: string;
  description: string;
  file_path: string | null;
  line_range: string | null;
  created_at: string;
};

export type ChatQueryRecord = {
  id: string;
  repo_id: string;
  asked_by: string | null;
  question: string;
  answer: string;
  cited_evidence_ids: string[];
  created_at: string;
};

export type Sprint = {
  id: string;
  repo_id: string;
  name: string;
  start_date: string;
  end_date: string;
  planned_ticket_keys: string[];
  created_at: string;
};

export type BurndownPoint = {
  day: string;
  planned_tickets: number;
  confidence_weighted_complete: number;
  fully_shipped: number;
};

export type Burndown = { sprint: Sprint; points: BurndownPoint[] };

export type ReportType = "client_portal" | "investor_update" | "sprint_rollup" | "onboarding_doc" | "custom";

export type ReportDocument = {
  id: string;
  repo_id: string;
  report_type: ReportType;
  period_start: string | null;
  period_end: string | null;
  title: string;
  summary_text: string;
  status: "generating" | "ready" | "failed";
  share_token: string | null;
  custom_sections: string[] | null;
  created_at: string;
};

export type ReportSectionOption = {
  key: string;
  label: string;
  description: string;
};

export type PublicPortalReport = {
  title: string;
  status: string;
  summary_text: string | null;
  period_start: string | null;
  period_end: string | null;
  branding: { name: string; logo_url: string | null; primary_color_hex: string };
};

export type AccuracyPoint = {
  month: string;
  person_github_login: string;
  tickets_completed: number;
  tickets_with_unresolved_flags: number;
  avg_confidence_score: number | null;
  accuracy_pct: number;
};

export type ROISummary = {
  period_start: string;
  period_end: string;
  team_report_days: number;
  people_covered: number;
  avg_standup_minutes: number;
  hours_saved: number;
  hourly_rate_usd: number | null;
  dollars_saved: number | null;
};

export type OrphanCommit = {
  id: string;
  sha: string;
  author_github_login: string;
  message: string;
  committed_at: string;
  files_changed: number;
};

export type LogicalWorkUnit = {
  ticket_key: string;
  repo_full_names: string[];
  commit_count: number;
  commit_ids: string[];
  first_committed_at: string;
  last_committed_at: string;
};

export type ImpactMapEntry = { file_path: string; evidence_count: number; kinds: string[] };

export type AuditLogEntry = {
  id: string;
  repo_id: string | null;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  created_at: string;
};

export type WorkspaceSettings = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color_hex: string;
  avg_standup_minutes: number;
  hourly_rate_usd: number | null;
  updated_at: string;
};

// --- Auth + Super-Admin Dashboard (spec Sections 6, 7) -----------------------

export type CurrentUser = {
  id: string;
  email: string | null;
  github_login: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string;
  workspace_id: string | null;
  last_login_at: string | null;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: CurrentUser;
};

export type AdminOverview = {
  workspace_count: number;
  active_workspace_count: number;
  user_count: number;
  total_mrr: number;
  open_error_count: number;
  unresolved_flag_count: number;
};

export type AdminWorkspace = {
  id: string;
  name: string;
  account_login: string;
  plan_tier: string;
  status: string;
  mrr: number;
  repo_count: number;
  user_count: number;
  created_at: string;
};

export type AdminUser = {
  id: string;
  email: string | null;
  github_login: string | null;
  name: string | null;
  role: string;
  workspace_id: string | null;
  workspace_name: string | null;
  last_login_at: string | null;
  created_at: string;
};

export type AdminErrorEvent = {
  id: string;
  workspace_id: string | null;
  source: string;
  severity: string;
  message: string;
  stack_ref: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type AdminSystemMetric = {
  id: string;
  metric_name: string;
  value: number;
  workspace_id: string | null;
  recorded_at: string;
};

export type AdminRevenue = {
  total_mrr: number;
  workspace_count: number;
  by_plan_tier: Record<string, number>;
  by_status: Record<string, number>;
};

export type Subscription = {
  id: string;
  workspace_id: string;
  plan_tier: string;
  status: string;
  mrr: number;
  payment_provider: "stripe" | "paystack";
  renewed_at: string | null;
  created_at: string;
  trial_ends_at: string | null;
  has_active_access: boolean;
};

export type PricingPlan = {
  id: string;
  tier: string;
  name: string;
  price_usd: number;
  billing_interval: "month" | "year";
  is_active: boolean;
  has_stripe_price: boolean;
  has_paystack_plan: boolean;
  updated_at: string;
};

export type AdminFeatureFlag = {
  id: string;
  key: string;
  description: string | null;
  enabled_globally: boolean;
  enabled_workspace_ids: string[];
  min_plan_tier: string | null;
  created_at: string;
  updated_at: string;
};

// --- Phase 2/3 competitor-parity features -------------------------------------

export type DORAMetrics = {
  period_start: string;
  period_end: string;
  deployed_pr_count: number;
  deployment_frequency_per_day: number;
  lead_time_for_changes_hours: number | null;
  change_failure_rate: number | null;
  mean_time_to_restore_hours: number | null;
  unavailable_metrics_note: string | null;
};

export type BenchmarkBand = "elite" | "good" | "fair" | "needs_focus";

export type BenchmarkedValue = {
  value: number | null;
  band: BenchmarkBand | null;
  unit: string;
};

export type EfficiencyReport = {
  period_start: string;
  period_end: string;
  merged_pr_count: number;
  coding_time_hours: BenchmarkedValue;
  pr_pickup_time_hours: BenchmarkedValue;
  pr_review_time_hours: BenchmarkedValue;
  deploy_time_hours: BenchmarkedValue;
  cycle_time_hours: BenchmarkedValue;
  merge_frequency_per_dev_per_week: BenchmarkedValue;
  pr_size_lines: BenchmarkedValue;
  review_depth_per_pr: number | null;
  prs_merged_without_review_pct: number | null;
  rework_rate_pct: BenchmarkedValue;
  refactor_rate_pct: BenchmarkedValue;
  change_failure_rate_pct: BenchmarkedValue;
  mttr_hours: BenchmarkedValue;
  method_note: string;
};

export type InvestmentCategory = "new_value" | "feature_enhancements" | "developer_experience" | "keeping_the_lights_on";

export type InvestmentCategoryEntry = {
  category: InvestmentCategory;
  ticket_count: number;
  code_change_lines: number;
  pct_of_categorized_lines: number;
  target_pct: number;
};

export type InvestmentProfileReport = {
  period_start: string;
  period_end: string;
  categories: InvestmentCategoryEntry[];
  uncategorized_code_change_lines: number;
  uncategorized_pct_of_total: number;
  inefficiency_pool_pct: number | null;
  method_note: string;
};

export type CodeHealthSignals = {
  period_start: string;
  period_end: string;
  total_evidence_items: number;
  test_added_count: number;
  test_missing_count: number;
  dead_code_count: number;
  todo_count: number;
  risk_count: number;
  health_score: number | null;
};

export type RiskRadar = {
  repo_id: string;
  open_flags_by_type: Record<string, number>;
  low_confidence_ticket_count: number;
  stale_in_progress_ticket_count: number;
  risk_score: number;
};

export type GoalDirection = "higher_is_better" | "lower_is_better" | "target_seeking";

export type TeamGoal = {
  id: string;
  workspace_id: string;
  repo_id: string | null;
  parent_goal_id: string | null;
  name: string;
  metric_key: string;
  direction: GoalDirection;
  target_value: number;
  period_start: string;
  period_end: string;
  current_value: number | null;
  progress_pct: number | null;
  is_breaching: boolean;
  last_alert_sent_at: string | null;
  created_at: string;
};

// --- Phase 3 competitor-parity features (part 2) ------------------------------

export type PullRequest = {
  id: string;
  repo_id: string;
  number: number;
  title: string;
  author_github_login: string;
  state: string;
  opened_at: string;
  merged_at: string | null;
  linked_ticket_key: string | null;
  policy_labels_applied: string[];
  policy_reviewers_requested: string[];
  policy_auto_approved_sha: string | null;
};

export type ReviewerSuggestion = { file_path: string; suggested_reviewers: string[]; basis: string };

export type PRAutoRouteResult = {
  pr_number: number;
  suggestions: ReviewerSuggestion[];
  top_suggested_reviewers: string[];
};

export type ValueStreamStage = { status: string; avg_hours: number; sample_count: number };

export type ValueStreamReport = {
  period_start: string;
  period_end: string;
  stages: ValueStreamStage[];
  tracked_ticket_count: number;
};

export type CapitalizationEntry = {
  category: "capitalizable_new_development" | "non_capitalizable_maintenance";
  ticket_count: number;
  commit_count: number;
  estimated_hours: number;
  estimated_cost_usd: number | null;
};

export type CapitalizationReport = {
  period_start: string;
  period_end: string;
  hourly_rate_usd: number | null;
  entries: CapitalizationEntry[];
  method_note: string;
};

export type DeliveryForecast = {
  sprint_id: string;
  method: string;
  current_confidence_weighted_complete: number;
  planned_tickets: number;
  velocity_per_day: number | null;
  projected_completion_date: string | null;
  projection_note: string | null;
};

export type ContributorStat = {
  author_github_login: string;
  commit_count: number;
  ai_assisted_commit_count: number;
  ai_assisted_pct: number;
};

export type ContributionReport = {
  period_start: string;
  period_end: string;
  contributors: ContributorStat[];
  method_note: string;
};

export type AllocationEntry = { label: string; commit_count: number; additions: number; deletions: number; pct_of_commits: number };

export type AllocationReport = {
  period_start: string;
  period_end: string;
  by_repo: AllocationEntry[];
  by_person: AllocationEntry[];
};

export type ChangelogDay = { day: string; merged_pr_count: number; commit_count: number; entries: string[] };

export type PulseSurvey = {
  id: string;
  workspace_id: string;
  question: string;
  closes_at: string | null;
  response_count: number;
  average_score: number | null;
  created_at: string;
};

export type WorkingAgreement = {
  id: string;
  workspace_id: string;
  repo_id: string | null;
  title: string;
  body_markdown: string;
  created_at: string;
  updated_at: string;
};

export type IntegrationStatusValue = "connected" | "disconnected" | "error";

export type Integration = {
  id: string;
  workspace_id: string;
  provider: string;
  status: string;
  connected_at: string | null;
  created_at: string;
};

export type WorkspaceSSOConfig = {
  id: string;
  workspace_id: string;
  issuer: string;
  client_id: string;
  enabled: boolean;
  has_scim_token: boolean;
  created_at: string;
};

export type MCPConfig = {
  has_token: boolean;
};

export type AIToolSubscription = {
  id: string;
  workspace_id: string;
  tool_name: string;
  seat_count: number;
  cost_per_seat_usd: number;
  billing_period: "monthly" | "annual";
  started_on: string;
  ended_on: string | null;
  notes: string | null;
  created_at: string;
  monthly_cost_usd: number;
  is_active: boolean;
};

export type AIToolSubscriptionInput = {
  tool_name: string;
  seat_count: number;
  cost_per_seat_usd: number;
  billing_period: "monthly" | "annual";
  started_on: string;
  ended_on?: string | null;
  notes?: string | null;
};

export type AIToolCostReportEntry = {
  tool_name: string;
  seat_count: number;
  monthly_cost_usd: number;
};

export type AIToolCostReport = {
  total_monthly_cost_usd: number;
  active_subscription_count: number;
  entries: AIToolCostReportEntry[];
  subscriptions: AIToolSubscription[];
  repo_ai_assisted_pct: number | null;
  cost_per_adoption_point_usd: number | null;
  method_note: string;
};

async function doFetch(path: string, init: RequestInit | undefined, accessToken: string | null): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

/** For endpoints reachable without a session (login, password reset) — never
 * attaches a stale token or tries to refresh on 401 (a wrong password is not
 * "your session expired"). */
async function apiFetchNoAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await doFetch(path, init, null);
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await doFetch(path, init, getAccessToken());
  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(path, init, newToken);
    } else if (typeof window !== "undefined") {
      clearTokens();
      window.location.href = "/login";
    }
  }
  // 402 = the workspace's trial ended and it isn't on a paid plan (see
  // app/billing_access.py) — handled globally here, not per-page, so no
  // individual page needs its own special-case for it. /subscribe itself
  // calls billing/pricing endpoints, which are never gated, so this never
  // becomes a redirect loop.
  if (res.status === 402 && typeof window !== "undefined" && window.location.pathname !== "/subscribe") {
    window.location.href = "/subscribe";
  }
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listRepos: () => apiFetch<Repo[]>("/repos"),
  updateRepo: (repoId: string, payload: { slack_channel_id?: string | null }) =>
    apiFetch<Repo>(`/repos/${repoId}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listTickets: (repoId: string) => apiFetch<Ticket[]>(`/tickets?repo_id=${repoId}`),
  getTicket: (ticketId: string) => apiFetch<Ticket>(`/tickets/${ticketId}`),
  createTicket: (payload: { repo_id: string; key: string; title: string; status: string; description?: string; assignee_github_login?: string }) =>
    apiFetch<Ticket>("/tickets", { method: "POST", body: JSON.stringify(payload) }),
  updateTicket: (ticketId: string, payload: Record<string, unknown>) =>
    apiFetch<Ticket>(`/tickets/${ticketId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  getImpactMap: (ticketId: string) => apiFetch<ImpactMapEntry[]>(`/tickets/${ticketId}/impact-map`),
  detectDrift: (ticketId: string) => apiFetch<{ queued: boolean }>(`/tickets/${ticketId}/detect-drift`, { method: "POST" }),

  dashboardSummary: (repoId: string) => apiFetch<DashboardSummary>(`/dashboard/summary?repo_id=${repoId}`),

  listStandups: (repoId: string, day: string) =>
    apiFetch<StandupUpdate[]>(`/standup?repo_id=${repoId}&day=${day}`),
  generateStandup: (repoId: string, authorGithubLogin: string, day: string) =>
    apiFetch<{ queued: boolean }>(
      `/standup/generate?repo_id=${repoId}&author_github_login=${encodeURIComponent(authorGithubLogin)}&day=${day}`,
      { method: "POST" },
    ),

  repoChat: (repoId: string, question: string, askedBy?: string) =>
    apiFetch<{ answer: string; citations: EvidenceItem[] }>("/chat", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, question, asked_by: askedBy }),
    }),
  chatHistory: (repoId: string) => apiFetch<ChatQueryRecord[]>(`/chat/history?repo_id=${repoId}`),

  listFlags: (repoId: string) => apiFetch<ReconciliationFlag[]>(`/flags?repo_id=${repoId}`),
  resolveFlag: (flagId: string) => apiFetch<ReconciliationFlag>(`/flags/${flagId}/resolve`, { method: "POST" }),

  listOrphanCommits: (repoId: string) => apiFetch<OrphanCommit[]>(`/repos/${repoId}/orphan-commits`),
  detectOrphans: (repoId: string) => apiFetch<{ queued: boolean }>(`/repos/${repoId}/detect-orphans`, { method: "POST" }),
  linkOrphanCommit: (commitId: string, ticketKey: string) =>
    apiFetch<{ linked: boolean }>(`/orphan-commits/${commitId}/link`, {
      method: "POST",
      body: JSON.stringify({ ticket_key: ticketKey }),
    }),

  listSprints: (repoId: string) => apiFetch<Sprint[]>(`/sprints?repo_id=${repoId}`),
  createSprint: (payload: { repo_id: string; name: string; start_date: string; end_date: string; planned_ticket_keys: string[] }) =>
    apiFetch<Sprint>("/sprints", { method: "POST", body: JSON.stringify(payload) }),
  getBurndown: (sprintId: string) => apiFetch<Burndown>(`/sprints/${sprintId}/burndown`),

  listReports: (repoId: string, reportType?: ReportType) =>
    apiFetch<ReportDocument[]>(`/reports?repo_id=${repoId}${reportType ? `&report_type=${reportType}` : ""}`),
  getReport: (reportId: string) => apiFetch<ReportDocument>(`/reports/${reportId}`),
  generateSprintRollup: (repoId: string, sprintId: string) =>
    apiFetch<ReportDocument>("/reports/sprint-rollup", { method: "POST", body: JSON.stringify({ repo_id: repoId, sprint_id: sprintId }) }),
  generateInvestorUpdate: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<ReportDocument>("/reports/investor-update", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, period_start: periodStart, period_end: periodEnd }),
    }),
  generateClientPortalReport: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<ReportDocument>("/reports/client-portal", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, period_start: periodStart, period_end: periodEnd }),
    }),
  generateOnboardingDoc: (repoId: string) =>
    apiFetch<ReportDocument>("/reports/onboarding-doc", { method: "POST", body: JSON.stringify({ repo_id: repoId }) }),
  listCustomReportSections: () => apiFetch<ReportSectionOption[]>("/reports/custom/sections"),
  generateCustomReport: (repoId: string, periodStart: string, periodEnd: string, sections: string[]) =>
    apiFetch<ReportDocument>("/reports/custom", {
      method: "POST",
      body: JSON.stringify({ repo_id: repoId, period_start: periodStart, period_end: periodEnd, sections }),
    }),
  getPublicPortalReport: (shareToken: string) => apiFetch<PublicPortalReport>(`/portal/${shareToken}`),

  getAccuracy: (repoId: string) => apiFetch<AccuracyPoint[]>(`/accuracy?repo_id=${repoId}`),
  getRoi: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<ROISummary>(`/roi?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),

  listWorkUnits: (workspaceId: string) => apiFetch<LogicalWorkUnit[]>(`/work-units?workspace_id=${workspaceId}`),

  listAuditLog: (repoId: string) => apiFetch<AuditLogEntry[]>(`/audit?repo_id=${repoId}`),
  auditExportUrl: (repoId: string) => `${API_BASE_URL}/audit/export?repo_id=${repoId}`,

  getSettings: (workspaceId: string) => apiFetch<WorkspaceSettings>(`/settings?workspace_id=${workspaceId}`),
  updateSettings: (
    workspaceId: string,
    payload: Partial<Pick<WorkspaceSettings, "name" | "logo_url" | "primary_color_hex" | "avg_standup_minutes" | "hourly_rate_usd">>,
  ) => apiFetch<WorkspaceSettings>(`/settings?workspace_id=${workspaceId}`, { method: "PUT", body: JSON.stringify(payload) }),

  // --- Auth (spec Section 6) ---
  login: (email: string, password: string) =>
    apiFetchNoAuth<TokenPair>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => apiFetch<CurrentUser>("/auth/me"),
  logout: () => apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  requestPasswordReset: (email: string) =>
    apiFetchNoAuth<{ ok: boolean; message: string }>("/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    apiFetchNoAuth<TokenPair>("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),
  acceptInvite: (token: string, password: string) =>
    apiFetchNoAuth<TokenPair>("/auth/accept-invite", { method: "POST", body: JSON.stringify({ token, password }) }),

  // --- Team management (Settings → Team) ---
  listWorkspaceUsers: () => apiFetch<CurrentUser[]>("/auth/users"),
  inviteUser: (email: string, role: string, name?: string) =>
    apiFetch<{ ok: boolean; email: string }>("/auth/invite", { method: "POST", body: JSON.stringify({ email, role, name }) }),
  changeUserRole: (userId: string, role: string) =>
    apiFetch<CurrentUser>(`/auth/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  removeUser: (userId: string) => apiFetch<{ ok: boolean }>(`/auth/users/${userId}`, { method: "DELETE" }),

  // --- Super-Admin Dashboard (spec Section 7) ---
  adminOverview: () => apiFetch<AdminOverview>("/admin/overview"),
  adminListWorkspaces: (search?: string) => apiFetch<AdminWorkspace[]>(`/admin/workspaces${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  adminUpdateWorkspace: (workspaceId: string, payload: { status?: string; plan_tier?: string }) =>
    apiFetch<AdminWorkspace>(`/admin/workspaces/${workspaceId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminListUsers: (search?: string) => apiFetch<AdminUser[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  adminListErrors: (includeResolved = false) => apiFetch<AdminErrorEvent[]>(`/admin/errors?include_resolved=${includeResolved}`),
  adminResolveError: (errorId: string) => apiFetch<AdminErrorEvent>(`/admin/errors/${errorId}/resolve`, { method: "POST" }),
  adminListMetrics: (metricName?: string) => apiFetch<AdminSystemMetric[]>(`/admin/metrics${metricName ? `?metric_name=${metricName}` : ""}`),
  adminRevenue: () => apiFetch<AdminRevenue>("/admin/revenue"),
  adminListFlags: () => apiFetch<AdminFeatureFlag[]>("/admin/flags"),
  adminCreateFlag: (payload: { key: string; description?: string; enabled_globally?: boolean; min_plan_tier?: string | null }) =>
    apiFetch<AdminFeatureFlag>("/admin/flags", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateFlag: (flagId: string, payload: Partial<{ description: string; enabled_globally: boolean; min_plan_tier: string | null }>) =>
    apiFetch<AdminFeatureFlag>(`/admin/flags/${flagId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminAuditLog: (limit = 100) => apiFetch<AuditLogEntry[]>(`/admin/audit?limit=${limit}`),

  // --- Phase 2/3 competitor-parity features ---
  resolvedFeatureFlags: (keys: string[]) => apiFetch<{ flags: Record<string, boolean> }>(`/billing/feature-flags?keys=${keys.join(",")}`),
  getSubscription: () => apiFetch<Subscription>("/billing/subscription"),
  listPricingPlans: () => apiFetchNoAuth<PricingPlan[]>("/pricing-plans"),
  createCheckout: (payload: { plan_tier: string; success_url: string; cancel_url: string; provider: "stripe" | "paystack" }) =>
    apiFetch<{ checkout_url: string }>("/billing/checkout", { method: "POST", body: JSON.stringify(payload) }),
  createBillingPortal: (return_url: string) =>
    apiFetch<{ portal_url: string }>("/billing/portal", { method: "POST", body: JSON.stringify({ return_url }) }),
  getDora: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<DORAMetrics>(`/dora?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),
  getEfficiency: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<EfficiencyReport>(`/efficiency?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),
  getInvestmentProfile: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<InvestmentProfileReport>(`/allocation/profile?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),
  getCodeHealth: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<CodeHealthSignals>(`/code-health?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),
  getRiskRadar: (repoId: string) => apiFetch<RiskRadar>(`/risk?repo_id=${repoId}`),
  listTeamGoals: (workspaceId: string) => apiFetch<TeamGoal[]>(`/goals?workspace_id=${workspaceId}`),
  createTeamGoal: (payload: {
    name: string;
    metric_key: string;
    target_value: number;
    period_start: string;
    period_end: string;
    repo_id?: string | null;
    parent_goal_id?: string | null;
  }) => apiFetch<TeamGoal>("/goals", { method: "POST", body: JSON.stringify(payload) }),
  deleteTeamGoal: (goalId: string) => apiFetch<{ ok: boolean }>(`/goals/${goalId}`, { method: "DELETE" }),

  // --- PR AutoRoute ---
  listPullRequests: (repoId: string) => apiFetch<PullRequest[]>(`/pr-autoroute/pull-requests?repo_id=${repoId}`),
  suggestReviewers: (pullRequestId: string) => apiFetch<PRAutoRouteResult>(`/pr-autoroute/${pullRequestId}/suggest`),

  // --- Value Stream View ---
  getValueStream: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<ValueStreamReport>(`/value-stream?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),

  // --- Cost Capitalization ---
  getCapitalization: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<CapitalizationReport>(`/capitalization?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),

  // --- Delivery Forecast ---
  getDeliveryForecast: (sprintId: string) => apiFetch<DeliveryForecast>(`/forecast/${sprintId}`),

  // --- AI Contribution Tracker ---
  getContributions: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<ContributionReport>(`/contributions?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),

  // --- Investment Allocation Dashboard ---
  getAllocation: (workspaceId: string, periodStart: string, periodEnd: string) =>
    apiFetch<AllocationReport>(`/allocation?workspace_id=${workspaceId}&period_start=${periodStart}&period_end=${periodEnd}`),

  // --- Visual Changelog ---
  getChangelog: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<ChangelogDay[]>(`/changelog?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),

  // --- Pulse Surveys ---
  listPulseSurveys: (workspaceId: string) => apiFetch<PulseSurvey[]>(`/pulse-surveys?workspace_id=${workspaceId}`),
  createPulseSurvey: (payload: { question: string; closes_at?: string | null }) =>
    apiFetch<PulseSurvey>("/pulse-surveys", { method: "POST", body: JSON.stringify(payload) }),
  respondToPulseSurvey: (surveyId: string, score: number, comment?: string) =>
    apiFetch<{ ok: boolean }>(`/pulse-surveys/${surveyId}/respond`, { method: "POST", body: JSON.stringify({ score, comment }) }),

  // --- Working Agreements ---
  listWorkingAgreements: (workspaceId: string) => apiFetch<WorkingAgreement[]>(`/working-agreements?workspace_id=${workspaceId}`),
  upsertWorkingAgreement: (title: string, payload: { body_markdown: string; repo_id?: string | null }) =>
    apiFetch<WorkingAgreement>(`/working-agreements/${encodeURIComponent(title)}`, { method: "PUT", body: JSON.stringify(payload) }),

  // --- Open Integration Framework ---
  listIntegrations: (workspaceId: string) => apiFetch<Integration[]>(`/integrations?workspace_id=${workspaceId}`),
  connectIntegration: (provider: string, config: Record<string, string>) =>
    apiFetch<Integration>("/integrations/connect", { method: "POST", body: JSON.stringify({ provider, config }) }),
  disconnectIntegration: (integrationId: string) =>
    apiFetch<Integration>(`/integrations/${integrationId}/disconnect`, { method: "POST" }),

  // --- Workspace SSO / SCIM config ---
  getSSOConfig: () => apiFetch<WorkspaceSSOConfig | null>("/sso-config"),
  upsertSSOConfig: (payload: { issuer: string; client_id: string; client_secret: string; enabled: boolean }) =>
    apiFetch<WorkspaceSSOConfig>("/sso-config", { method: "PUT", body: JSON.stringify(payload) }),
  rotateSCIMToken: () => apiFetch<{ scim_token: string }>("/sso-config/rotate-scim-token", { method: "POST" }),
  getMCPConfig: () => apiFetch<MCPConfig>("/mcp-config"),
  rotateMCPToken: () => apiFetch<{ mcp_token: string }>("/mcp-config/rotate-token", { method: "POST" }),
  listAIToolSubscriptions: () => apiFetch<AIToolSubscription[]>("/ai-tool-costs"),
  createAIToolSubscription: (payload: AIToolSubscriptionInput) =>
    apiFetch<AIToolSubscription>("/ai-tool-costs", { method: "POST", body: JSON.stringify(payload) }),
  updateAIToolSubscription: (id: string, payload: Partial<AIToolSubscriptionInput>) =>
    apiFetch<AIToolSubscription>(`/ai-tool-costs/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteAIToolSubscription: (id: string) => apiFetch<{ deleted: boolean }>(`/ai-tool-costs/${id}`, { method: "DELETE" }),
  getAIToolCostReport: (repoId?: string | null) =>
    apiFetch<AIToolCostReport>(`/ai-tool-costs/report${repoId ? `?repo_id=${repoId}` : ""}`),
};

export { API_BASE_URL };
