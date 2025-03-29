import type { Meta, StoryObj } from "@storybook/react";
import Clue from "../components/phases/Clue/Clue";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";

const meta = {
  title: "Clue/Clue",
  component: Clue,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
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

const cluePlayers = getPlayers(5);

export const NoClues: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      round: 1,
      players: cluePlayers,
      playerID: cluePlayers[0].id,
    },
  },
};

export const NoCluesNotTurn: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      round: 1,
      players: cluePlayers,
      playerID: cluePlayers[1].id,
    },
  },
};

export const NoCluesFirstPlayerDead: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      round: 1,
      players: cluePlayers.map((p, i) => {
        if (i === 0) {
          return { ...p, alive: false };
        }
        return p;
      }),
      playerID: cluePlayers[1].id,
    },
  },
};
