import { defineConfig } from "@playwright/test";

/**
 * Projects mirror Java functional suites:
 * - display + layout → CI / `pnpm test`
 * - thorough + performance → local-only scripts
 */
export default defineConfig({
  testDir: "./test/functional",
  testMatch: "**/*.spec.tsx",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:5176",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec vite --config vite.functional.config.ts",
    url: "http://127.0.0.1:5176/functional",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "display", testMatch: "display/**/*.spec.tsx" },
    { name: "layout", testMatch: "layout/**/*.spec.tsx" },
    { name: "thorough", testMatch: "thorough/**/*.spec.tsx" },
    {
      name: "performance",
      testMatch: "performance/**/*.spec.tsx",
      timeout: 180_000,
    },
  ],
});
