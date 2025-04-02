import type { Meta, StoryObj } from "@storybook/react";
import Vote from "../components/phases/Vote/Vote";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { Player } from "../game/player.ts";

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

export const Base: Story = {};
