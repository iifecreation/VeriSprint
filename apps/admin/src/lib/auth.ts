"use client";

import { API_BASE_URL } from "./config";

/**
 * Token storage + refresh (spec Section 6) — same scheme as apps/web, kept
 * as a separate copy rather than a shared package since this is a
 * standalone deploy with its own login. A super_admin token works against
 * either app; this one just never stores/reads apps/web's, and vice versa
 * (distinct localStorage keys), so signing out of one doesn't affect the other.
 */

const ACCESS_TOKEN_KEY = "verisprint_admin_access_token";
const REFRESH_TOKEN_KEY = "verisprint_admin_refresh_token";

export type TokenPair = { access_token: string; refresh_token: string; expires_in: number };

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(pair: { access_token: string; refresh_token: string }): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, pair.access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, pair.refresh_token);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}

export function decodeAccessTokenClaims(): { role: string; workspace_id: string | null; sub: string } | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) {
          clearTokens();
          return null;
        }
        const pair: TokenPair = await res.json();
        storeTokens(pair);
        return pair.access_token;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function logout(): Promise<void> {
  const token = getAccessToken();
  clearTokens();
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // Token's cleared client-side either way.
    }
  }
}
