"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storeTokens } from "@/lib/auth";

/**
 * Landing point for the GitHub OAuth / SSO redirect (spec Section 6). The API
 * hands the token pair back as a URL *fragment* (`#access_token=...`), never
 * a query string — fragments never reach the server or access logs. This
 * page's only job is to read that fragment, persist it, and get out of the way.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Deferred to a microtask — see TopNav.tsx for why direct setState in an
    // effect body is avoided here.
    queueMicrotask(() => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setError("Sign-in didn't come back with a token — please try again.");
        return;
      }

      storeTokens({ access_token: accessToken, refresh_token: refreshToken });
      // Clear the fragment from the URL bar before navigating away.
      window.history.replaceState(null, "", window.location.pathname);
      router.replace("/dashboard");
    });
  }, [router]);

  if (error) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center text-sm text-red-600">
        {error} <a href="/login" className="underline">Back to sign in</a>
      </div>
    );
  }

  return <div className="mx-auto max-w-sm px-4 py-16 text-center text-sm text-gray-400">Signing you in…</div>;
}
