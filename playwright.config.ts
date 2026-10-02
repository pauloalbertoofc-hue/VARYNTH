import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const devPort = new URL(baseURL).port || "3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: { baseURL, trace: "on-first-retry", ...devices["Desktop Chrome"] },
  webServer: { command: `npm run dev -- --hostname 127.0.0.1 --port ${devPort}`, url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
