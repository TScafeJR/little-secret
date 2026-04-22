import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import Vote from "../components/phases/Vote/Vote";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { Player } from "../game/player.ts";
import { GameEvent } from "../game/events";

const players = getPlayers(5);

const meta = {
  title: "Vote/Vote",
  component: Vote,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: players.map<Player>((p, i) => {
        if (i === 0) {
          p.confirmedVote = true;
        }

        if (i % 3 === 0) {
          p.alive = false;
        }

        return p;
      }),
      playerID: players[0].id,
    },
  },
} satisfies Meta<typeof Vote>;

export default meta;

type Story = StoryObj<typeof meta>;

const sendVote = fn();

const voteField = getPlayers(5);

export const ClicksVote: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      roomCode: "VOTE1",
      sendSocketMessage: sendVote,
      players: voteField.map<Player>((p, i) => ({
        ...p,
        confirmedVote: i === 0,
        alive: true,
      })),
      playerID: voteField[0].id,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const firstTarget = voteField
      .filter((p) => p.id !== voteField[0].id && p.alive)
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    const btn = canvas.getByTestId(`vote-for-${firstTarget.id}`);
    await userEvent.click(btn);
    await expect(sendVote).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GameEvent.VOTE,
        roomID: "VOTE1",
        playerID: voteField[0].id,
        text: firstTarget.id,
      }),
    );
  },
};

export const Base: Story = {};
