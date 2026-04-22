import type { Meta, StoryObj } from "@storybook/react-vite";
import WaitingForPlayers from "../components/game/WaitingForPlayers";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { Player } from "../game/player.ts";

const players = getPlayers(5);

const meta = {
  title: "components/WaitingForPlayers",
  component: WaitingForPlayers,
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

        if (i % 2 === 0) {
          p.alive = false;
        }

        return p;
      }),
    },
  },
} satisfies Meta<typeof WaitingForPlayers>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Base: Story = {};
