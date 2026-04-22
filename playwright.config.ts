import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const projects = () => {
  const base = [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ];

  if (process.env.CI) {
    return base.concat([
      {
        name: "Mobile Chrome",
        use: { ...devices["Pixel 5"] },
      },
      {
        name: "firefox",
        use: { ...devices["Desktop Firefox"] },
      },

      {
        name: "webkit",
        use: { ...devices["Desktop Safari"] },
      },
      {
        name: "Mobile Safari",
        use: { ...devices["iPhone 12"] },
      },
    ]);
  }

  return base;
};

const localAppOrigin = "http://127.0.0.1:5173";

// Skip the managed Vite process when you already run `yarn dev` in another
// shell (avoids Playwright blocking forever on the webServer “wait for URL”
// if the child process deadlocks; see stdout/stderr below).
const skipPlaywrightWebServer = Boolean(
  process.env.PLAYWRIGHT_BASE_URL || process.env.PLAYWRIGHT_SKIP_WEB_SERVER,
);

const devWebServer = skipPlaywrightWebServer
  ? undefined
  : {
      // Start Vite on :5173 (matches helpers appUrl). E2E still needs the Go WS
      // server (e.g. `make go-srv`); see CLAUDE.md.
      command: "yarn run dev" as const,
      url: localAppOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      cwd: repoRoot,
      // If stdout/stderr fill (yarn/vite can be very chatty), the child can block
      // on a full pipe; then the URL never becomes ready and no tests or WS run.
      stdout: "ignore" as const,
      stderr: "ignore" as const,
    };

export default defineConfig({
  // 7–8 player journeys open many browser contexts; allow enough time per test.
  timeout: 300_000,
  testDir: "./src/tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  webServer: devWebServer,
  use: {
    trace: "on-first-retry",
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
  },
  projects: projects(),
});
