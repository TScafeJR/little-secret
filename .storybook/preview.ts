import type { Preview } from "@storybook/react-vite";
import "../src/index.css";
import "../src/App.css";

const mobileViewportOptions = {
  mobile1: {
    name: "Small mobile",
    styles: {
      width: "320px",
      height: "568px",
    },
    type: "mobile",
  },
  mobile2: {
    name: "Large mobile",
    styles: {
      width: "414px",
      height: "896px",
    },
    type: "mobile",
  },
  tablet: {
    name: "Tablet",
    styles: {
      width: "768px",
      height: "1024px",
    },
    type: "tablet",
  },
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      options: mobileViewportOptions,
    },
  },
  initialGlobals: {
    viewport: { value: "mobile1", isRotated: false },
  },
};

export default preview;
