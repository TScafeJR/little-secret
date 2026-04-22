import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import GameOver from "../components/phases/GameOver/GameOver";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";

const endPlayers = getPlayers(4);

const meta = {
  title: "GameOver/GameOver",
  component: GameOver,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
} satisfies Meta<typeof GameOver>;

export default meta;

type Story = StoryObj<typeof meta>;

export const GoodWin: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: endPlayers,
      gameResult: {
        reason: "allImpostersOut",
        winningRoles: ["goodKitten"],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/all impostors were eliminated/i),
    ).toBeInTheDocument();
  },
};
