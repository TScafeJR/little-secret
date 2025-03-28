import type { Meta, StoryObj } from "@storybook/react";
import WaitingForPlayers from "../components/phases/Info/WaitingForPlayers";
import { GameStateDecorator, baseContext } from "./GameStateMock";

const meta = {
  title: "Lobby/WaitingForPlayers",
  component: WaitingForPlayers,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: [
        {
          id: "1",
          displayName: "Ty",
          confirmedVote: true,
        },
        {
          id: "2",
          displayName: "nugget",
          confirmedVote: false,
        },
        {
          id: "3",
          displayName: "Berlinnnnn",
          confirmedVote: false,
        },
      ],
    },
  },
} satisfies Meta<typeof WaitingForPlayers>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Base: Story = {};
