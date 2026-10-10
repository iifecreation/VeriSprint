import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTokens,
  decodeAccessTokenClaims,
  getAccessToken,
  getRefreshToken,
  isLoggedIn,
  logout,
  refreshAccessToken,
  storeTokens,
} from "../auth";

/** A real base64url-encoded JWT-shaped string — same encoding
 * decodeAccessTokenClaims expects (header.payload.signature, payload is
 * base64url without padding, same as a real backend-issued token). */
function fakeToken(claims: Record<string, unknown>): string {
  const base64url = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${base64url({ alg: "HS256" })}.${base64url(claims)}.fakesignature`;
}

beforeEach(() => {
  localStorage.clear();
});

describe("token storage", () => {
  it("round-trips access/refresh tokens through localStorage", () => {
    expect(isLoggedIn()).toBe(false);
    storeTokens({ access_token: "a1", refresh_token: "r1" });
    expect(getAccessToken()).toBe("a1");
    expect(getRefreshToken()).toBe("r1");
    expect(isLoggedIn()).toBe(true);
  });

  it("clearTokens removes both and flips isLoggedIn back to false", () => {
    storeTokens({ access_token: "a1", refresh_token: "r1" });
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });
});

describe("decodeAccessTokenClaims", () => {
  it("returns null when there's no stored token", () => {
    expect(decodeAccessTokenClaims()).toBeNull();
  });

  it("decodes a real base64url JWT payload", () => {
    const token = fakeToken({ sub: "user-1", role: "workspace_admin", workspace_id: "ws-1" });
    storeTokens({ access_token: token, refresh_token: "r1" });
    expect(decodeAccessTokenClaims()).toEqual({ sub: "user-1", role: "workspace_admin", workspace_id: "ws-1" });
  });

  it("returns null for a malformed token instead of throwing", () => {
    storeTokens({ access_token: "not-a-real-jwt", refresh_token: "r1" });
    expect(decodeAccessTokenClaims()).toBeNull();
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null without ever calling fetch when there's no refresh token", async () => {
    const result = await refreshAccessToken();
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stores and returns the new access token on success", async () => {
    storeTokens({ access_token: "old-access", refresh_token: "r1" });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 900 }),
    });

    const result = await refreshAccessToken();
    expect(result).toBe("new-access");
    expect(getAccessToken()).toBe("new-access");
    expect(getRefreshToken()).toBe("new-refresh");
  });

  it("clears tokens and returns null on a non-ok response", async () => {
    storeTokens({ access_token: "old-access", refresh_token: "r1" });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const result = await refreshAccessToken();
    expect(result).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("returns null (without throwing) on a network error", async () => {
    storeTokens({ access_token: "old-access", refresh_token: "r1" });
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));

    await expect(refreshAccessToken()).resolves.toBeNull();
  });

  it("de-duplicates concurrent callers into a single fetch", async () => {
    storeTokens({ access_token: "old-access", refresh_token: "r1" });
    let resolveFetch: (value: unknown) => void = () => {};
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const call1 = refreshAccessToken();
    const call2 = refreshAccessToken();
    resolveFetch({ ok: true, json: async () => ({ access_token: "new-access", refresh_token: "r2", expires_in: 900 }) });

    const [result1, result2] = await Promise.all([call1, call2]);
    expect(result1).toBe("new-access");
    expect(result2).toBe("new-access");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("clears tokens client-side even if the logout request fails", async () => {
    storeTokens({ access_token: "a1", refresh_token: "r1" });
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));

    await logout();
    expect(getAccessToken()).toBeNull();
  });

  it("does nothing network-wise when already logged out", async () => {
    await logout();
    expect(fetch).not.toHaveBeenCalled();
  });
});
