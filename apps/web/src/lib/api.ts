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
  | "anomaly_activity_drop";

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

export type ReportType = "client_portal" | "investor_update" | "sprint_rollup" | "onboarding_doc";

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
  created_at: string;
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
  change_failure_rate: null;
  mean_time_to_restore_hours: null;
  unavailable_metrics_note: string;
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

export type TeamGoal = {
  id: string;
  workspace_id: string;
  repo_id: string | null;
  name: string;
  metric_key: string;
  target_value: number;
  period_start: string;
  period_end: string;
  current_value: number | null;
  progress_pct: number | null;
  created_at: string;
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
  getDora: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<DORAMetrics>(`/dora?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),
  getCodeHealth: (repoId: string, periodStart: string, periodEnd: string) =>
    apiFetch<CodeHealthSignals>(`/code-health?repo_id=${repoId}&period_start=${periodStart}&period_end=${periodEnd}`),
  getRiskRadar: (repoId: string) => apiFetch<RiskRadar>(`/risk?repo_id=${repoId}`),
  listTeamGoals: (workspaceId: string) => apiFetch<TeamGoal[]>(`/goals?workspace_id=${workspaceId}`),
  createTeamGoal: (payload: { name: string; metric_key: string; target_value: number; period_start: string; period_end: string; repo_id?: string | null }) =>
    apiFetch<TeamGoal>("/goals", { method: "POST", body: JSON.stringify(payload) }),
};

export { API_BASE_URL };
