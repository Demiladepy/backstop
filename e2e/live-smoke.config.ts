import { defineConfig, devices } from "@playwright/test";

const LIVE =
  process.env.LIVE_URL ?? "https://festive-roadrunner-713.convex.site";

export default defineConfig({
  testDir: ".",
  testMatch: "live-smoke.spec.ts",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  timeout: 300_000,
  outputDir: "live-results",
  use: {
    baseURL: LIVE,
    trace: "retain-on-failure",
    video: "on",
    screenshot: "on",
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
