import type { Meta, StoryObj } from "@storybook/react";
import Clue from "../components/phases/Clue/Clue";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { Player as PlayerType } from "../game/player";
import { getPlayers } from "./helpers/players";

const meta = {
  title: "Clue/Clue",
  component: Clue,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
  args: {
    wordSeen: false,
  },
} satisfies Meta<typeof Clue>;

export default meta;

type Story = StoryObj<typeof meta>;

const players = getPlayers(5);

const baseStory: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: players,
    },
  },
};

export const Base: Story = {};
