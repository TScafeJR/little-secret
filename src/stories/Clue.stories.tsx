import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import Clue from "../components/phases/Clue/Clue";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { GameEvent } from "../game/events";

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

const sendClue = fn();

export const SubmitsClue: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      roomCode: "CLUER",
      players: cluePlayers,
      round: 1,
      playerID: cluePlayers[0].id,
      sendSocketMessage: sendClue,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText("Clue"), "pineapple");
    await userEvent.click(canvas.getByRole("button", { name: "Submit Clue" }));
    await expect(sendClue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GameEvent.SUBMIT_CLUE,
        text: "pineapple",
        roomID: "CLUER",
        playerID: cluePlayers[0].id,
      }),
    );
  },
};
