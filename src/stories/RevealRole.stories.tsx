import type { Meta, StoryObj } from "@storybook/react";
import RevealRole from "../components/phases/RevealRole/RevealRole";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";

const players = getPlayers(5);

const meta = {
  title: "RevealRole/RevealRole",
  component: RevealRole,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: players,
    },
  },
} satisfies Meta<typeof RevealRole>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Base: Story = {};
