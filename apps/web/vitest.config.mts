import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// Standard Next.js App Router Vitest setup (see node_modules/next/dist/docs/
// 01-app/02-guides/testing/vitest.md for this Next version's own guide) —
// jsdom for component rendering, tsconfigPaths so the "@/..." alias every
// page/component already uses resolves the same way it does in the app.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
