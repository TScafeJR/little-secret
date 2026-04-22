import { defineConfig } from "vitest/config";

/** Node game logic + React provider tests. Storybook: `vitest run --config vitest.storybook.workspace.ts`. */
export default defineConfig({
  test: {
    name: "unit",
    include: [
      "src/game/**/*.test.ts",
      "src/components/GameStateProvider.test.tsx",
    ],
    environment: "jsdom",
    setupFiles: ["./src/vitest-setup.ts"],
  },
});
