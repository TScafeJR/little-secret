import path from "node:path";
import { fileURLToPath } from "node:url";

import { defaultExclude, defineWorkspace } from "vitest/config";

import { storybookTest } from "@storybook/experimental-addon-test/vitest-plugin";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/writing-tests/test-addon
export default defineWorkspace([
  {
    extends: "./vite.config.ts",
    // Playwright E2E lives in `src/tests/`; do not collect it as Vitest tests.
    test: {
      exclude: [...defaultExclude, "src/tests/**"],
    },
  },
  {
    extends: "vite.config.ts",
    plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/writing-tests/test-addon#storybooktest
      storybookTest({ configDir: path.join(dirname, ".storybook") }),
    ],
    test: {
      name: "storybook",
      browser: {
        enabled: true,
        headless: true,
        provider: "playwright",
        // Vitest 3+ — use `instances` (top-level `name` is deprecated)
        instances: [{ browser: "chromium" }],
      },
      setupFiles: [".storybook/vitest.setup.ts"],
    },
  },
]);
