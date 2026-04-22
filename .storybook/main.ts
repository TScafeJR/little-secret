import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    {
      name: "@storybook/addon-mcp",
      options: {
        toolsets: {
          dev: true,
          docs: true,
          test: true,
        },
      },
    },
    "@storybook/addon-docs",
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
  ],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
