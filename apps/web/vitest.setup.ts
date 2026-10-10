// Adds the `toBeInTheDocument()`/etc. matchers to Vitest's `expect` — loaded
// once per test file via vitest.config.mts's `setupFiles`.
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library doesn't auto-unmount between tests under Vitest the
// way it does under Jest — without this, a render() in one test leaks into
// the next test's DOM query.
afterEach(() => {
  cleanup();
});
