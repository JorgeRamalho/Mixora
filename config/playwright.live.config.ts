import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "../tests/e2e",
  outputDir: "../test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: { mode: "only-on-failure", fullPage: true },
  },
  webServer: {
    command: "npx vite --port 5173 --strictPort --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
