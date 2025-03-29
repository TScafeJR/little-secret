import type { Meta, StoryObj } from "@storybook/react";
import ClueDisplay from "../components/phases/Clue/ClueDisplay";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { generateClues } from "./helpers/clues";

const meta = {
  title: "Clue/ClueDisplay",
  component: ClueDisplay,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
} satisfies Meta<typeof ClueDisplay>;

export default meta;

type Story = StoryObj<typeof meta>;

const players = getPlayers(5);

const baseStory: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: players,
      clues: {
        "1": generateClues(players),
      },
      round: 1,
    },
  },
};

export const Default: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
    },
  },
};
