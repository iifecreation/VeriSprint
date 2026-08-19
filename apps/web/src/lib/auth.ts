"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "./config";

/**
 * Token storage + refresh (spec Section 6). Tokens live in localStorage —
 * fine for a bearer-token SPA where every request already goes through
 * `apiFetch`'s explicit Authorization header (no cookie/CSRF surface to
 * worry about). `access_token` is short-lived (15 min); `refreshAccessToken`
 * is called automatically by `apiFetch` on a 401 before giving up.
 */

const ACCESS_TOKEN_KEY = "verisprint_access_token";
const REFRESH_TOKEN_KEY = "verisprint_refresh_token";

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

/** Decodes the access token's payload for UI hints only (e.g. showing the
 * Admin nav link) — never trust this for anything security-sensitive, the
 * API enforces every real permission check server-side regardless. */
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

/** Client-only hook wrapper around `decodeAccessTokenClaims`. Calling that
 * function directly in a render body reads `localStorage`, which returns
 * `null` during SSR but a real value on the client's first hydration pass —
 * a guaranteed hydration mismatch for any page that branches on it. This
 * always renders `null` on the first pass (matching the server) and fills
 * in the real claims from an effect afterward, same as the Sidebar's own
 * login-state check. */
export function useAccessTokenClaims(): ReturnType<typeof decodeAccessTokenClaims> {
  const [claims, setClaims] = useState<ReturnType<typeof decodeAccessTokenClaims>>(null);
  useEffect(() => {
    // Deferred to a microtask — see dashboard/page.tsx for why.
    queueMicrotask(() => {
      setClaims(decodeAccessTokenClaims());
    });
  }, []);
  return claims;
}

let refreshInFlight: Promise<string | null> | null = null;

/** Exchanges the stored refresh token for a new pair. De-duplicates
 * concurrent callers (several `apiFetch` calls hitting 401 at once) into a
 * single network request. Returns the new access token, or null if the
 * refresh itself failed (caller should treat that as "logged out"). */
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
      // Token's cleared client-side either way — a failed network call here isn't worth surfacing.
    }
  }
}
