import type { Meta, StoryObj } from "@storybook/react";
import Clue from "../components/phases/Clue/Clue";
import { GameStateDecorator, baseContext } from "./GameStateMock";
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

/**
 example

 export const Spy: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      currentWord: "",
    },
  },
};

*/

export const Base: Story = {
  ...baseStory,
};
