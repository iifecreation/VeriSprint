import { API_BASE_URL } from "./config";
import { clearTokens, getAccessToken, getRefreshToken, refreshAccessToken } from "./auth";

// --- Operator Console auth (app/routers/admin_auth.py) --------------------------
// Deliberately NOT the customer-facing /auth/* surface — this hits
// /admin/auth/*, backed by the separate AdminAccount table, not `users`.

export type CurrentAdmin = {
  id: string;
  email: string;
  name: string | null;
  last_login_at: string | null;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  admin: CurrentAdmin;
};

// --- Super-Admin Dashboard (spec Section 7) -------------------------------------

export type AdminOverview = {
  workspace_count: number;
  active_workspace_count: number;
  user_count: number;
  total_mrr: number;
  open_error_count: number;
  unresolved_flag_count: number;
  open_contact_message_count: number;
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

export type PricingPlanUpdate = {
  name?: string;
  price_usd?: number;
  billing_interval?: "month" | "year";
  is_active?: boolean;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  reason: string;
  message: string;
  resolved_at: string | null;
  created_at: string;
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

export type AdminRepo = {
  id: string;
  full_name: string;
  default_branch: string;
  is_active: boolean;
  slack_channel_id: string | null;
  service_id: string | null;
};

export type AdminSubscription = {
  plan_tier: string;
  status: string;
  mrr: number;
  renewed_at: string | null;
  payment_provider: string | null;
};

export type ImpersonationToken = {
  access_token: string;
  expires_in: number;
  target_user_id: string;
  target_user_email: string | null;
  target_user_role: string;
};

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

/** For endpoints reachable without a session (login) — never attaches a
 * stale token or tries to refresh on 401 (a wrong password is not "your
 * session expired"). */
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
  login: (email: string, password: string) =>
    apiFetchNoAuth<TokenPair>("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => apiFetch<CurrentAdmin>("/admin/auth/me"),
  logout: () => apiFetch<{ ok: boolean }>("/admin/auth/logout", { method: "POST" }),

  adminOverview: () => apiFetch<AdminOverview>("/admin/overview"),
  adminListWorkspaces: (search?: string) => apiFetch<AdminWorkspace[]>(`/admin/workspaces${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  adminGetWorkspace: (workspaceId: string) => apiFetch<AdminWorkspace>(`/admin/workspaces/${workspaceId}`),
  adminUpdateWorkspace: (workspaceId: string, payload: { status?: string; plan_tier?: string }) =>
    apiFetch<AdminWorkspace>(`/admin/workspaces/${workspaceId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminWorkspaceRepos: (workspaceId: string) => apiFetch<AdminRepo[]>(`/admin/workspaces/${workspaceId}/repos`),
  adminWorkspaceSubscription: (workspaceId: string) =>
    apiFetch<AdminSubscription | null>(`/admin/workspaces/${workspaceId}/subscription`),
  adminImpersonateWorkspace: (workspaceId: string) =>
    apiFetch<ImpersonationToken>(`/admin/workspaces/${workspaceId}/impersonate`, { method: "POST" }),
  adminListUsers: (search?: string, workspaceId?: string) =>
    apiFetch<AdminUser[]>(
      `/admin/users?${search ? `search=${encodeURIComponent(search)}&` : ""}${workspaceId ? `workspace_id=${workspaceId}` : ""}`
    ),
  adminListErrors: (includeResolved = false) => apiFetch<AdminErrorEvent[]>(`/admin/errors?include_resolved=${includeResolved}`),
  adminResolveError: (errorId: string) => apiFetch<AdminErrorEvent>(`/admin/errors/${errorId}/resolve`, { method: "POST" }),
  adminListContactMessages: (includeResolved = false) =>
    apiFetch<ContactMessage[]>(`/admin/contact-messages?include_resolved=${includeResolved}`),
  adminResolveContactMessage: (messageId: string) =>
    apiFetch<ContactMessage>(`/admin/contact-messages/${messageId}/resolve`, { method: "POST" }),
  adminListMetrics: (metricName?: string) => apiFetch<AdminSystemMetric[]>(`/admin/metrics${metricName ? `?metric_name=${metricName}` : ""}`),
  adminRevenue: () => apiFetch<AdminRevenue>("/admin/revenue"),
  listPricingPlans: () => apiFetchNoAuth<PricingPlan[]>("/pricing-plans"),
  setPricingPlan: (tier: string, payload: PricingPlanUpdate) =>
    apiFetch<PricingPlan>(`/pricing-plans/${tier}`, { method: "PUT", body: JSON.stringify(payload) }),
  adminListFlags: () => apiFetch<AdminFeatureFlag[]>("/admin/flags"),
  adminCreateFlag: (payload: { key: string; description?: string; enabled_globally?: boolean; min_plan_tier?: string | null }) =>
    apiFetch<AdminFeatureFlag>("/admin/flags", { method: "POST", body: JSON.stringify(payload) }),
  adminUpdateFlag: (flagId: string, payload: Partial<{ description: string; enabled_globally: boolean; min_plan_tier: string | null }>) =>
    apiFetch<AdminFeatureFlag>(`/admin/flags/${flagId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminAuditLog: (limit = 100, workspaceId?: string) =>
    apiFetch<AuditLogEntry[]>(`/admin/audit?limit=${limit}${workspaceId ? `&workspace_id=${workspaceId}` : ""}`),
};

export { API_BASE_URL };
