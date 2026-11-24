import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:5180",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm exec vite --config vite.e2e.config.ts",
    url: "http://127.0.0.1:5180/e2e",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
