import { defineConfig, devices } from "@playwright/test";

const LIVE =
  process.env.LIVE_URL ?? "https://festive-roadrunner-713.convex.site";

export default defineConfig({
  testDir: ".",
  testMatch: "live-demo-record.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  outputDir: "demo-record-results",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: LIVE,
    headless: true,
    trace: "off",
    screenshot: "off",
    video: "on",
    actionTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
