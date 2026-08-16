// The dashboard app (login, signup-via-GitHub-install) and the API, both
// separate Next.js/FastAPI processes from this marketing site.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:53000";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:58000";

export const LOGIN_URL = `${APP_URL}/login`;
export const INSTALL_URL = `${API_BASE_URL}/github/install`;
export const CONTACT_EMAIL = "hello@verisprint.dev";
