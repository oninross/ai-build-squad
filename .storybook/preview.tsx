import type { Preview } from "@storybook/react-vite";
import "../src/styles/variables.css";
import "../src/styles/main.scss";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
