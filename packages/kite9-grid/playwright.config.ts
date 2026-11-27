import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/functional",
  testMatch: "**/*.spec.tsx",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:5177",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec vite --config vite.functional.config.ts",
    url: "http://127.0.0.1:5177/functional",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
