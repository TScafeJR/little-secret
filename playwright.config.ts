import { defineConfig, devices } from "@playwright/test";

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

export default defineConfig({
  timeout: 15000,
  testDir: "./src/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: projects(),
});
