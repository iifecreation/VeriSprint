import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Needed to preview the dev server through a proxied browser during
  // verification. Harmless in prod (Next only consults this in dev mode).
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
