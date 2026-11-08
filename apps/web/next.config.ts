import type { NextConfig } from "next";

// Sent on every response. The page-level Content-Security-Policy for the
// dashboard/admin apps is set per request in src/proxy.ts (it needs a nonce).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // Needed to preview the dev server through a proxied browser during
  // verification. Harmless in prod (Next only consults this in dev mode).
  allowedDevOrigins: ["127.0.0.1"],
  // Don't advertise the framework/version to attackers.
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image (deploy/).
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
