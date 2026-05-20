import type { Meta, StoryObj } from "@storybook/react-vite";
import { App } from "../src/App";

const meta: Meta<typeof App> = {
  title: "Scaffold/App",
  component: App,
};

export default meta;

type Story = StoryObj<typeof App>;

export const Default: Story = {};
