import { API_BASE_URL } from "./config";
import { clearTokens, getAccessToken, getRefreshToken, refreshAccessToken } from "./auth";

// --- Auth (spec Section 6) -----------------------------------------------------

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
    apiFetchNoAuth<TokenPair>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => apiFetch<CurrentUser>("/auth/me"),
  logout: () => apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  adminOverview: () => apiFetch<AdminOverview>("/admin/overview"),
  adminListWorkspaces: (search?: string) => apiFetch<AdminWorkspace[]>(`/admin/workspaces${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  adminUpdateWorkspace: (workspaceId: string, payload: { status?: string; plan_tier?: string }) =>
    apiFetch<AdminWorkspace>(`/admin/workspaces/${workspaceId}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminListUsers: (search?: string) => apiFetch<AdminUser[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
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
  adminAuditLog: (limit = 100) => apiFetch<AuditLogEntry[]>(`/admin/audit?limit=${limit}`),
};

export { API_BASE_URL };
