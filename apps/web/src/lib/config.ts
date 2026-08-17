export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
// The separate operator console (apps/admin) — linked from TopNav for
// super_admin users rather than an in-app route, since it's its own deploy.
export const ADMIN_APP_URL = process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? "http://localhost:53200";
