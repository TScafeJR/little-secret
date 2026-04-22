import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import Info from "../components/phases/Info/Info";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { GameEvent } from "../game/events";

const sendSocketMessage = fn();
const infoPlayers = getPlayers(4);

const meta = {
  title: "Info/Info",
  component: Info,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
} satisfies Meta<typeof Info>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConfirmsWord: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: infoPlayers,
      currentWord: "lighthouse",
      roomCode: "INFO1",
      playerID: infoPlayers[0].id,
      sendSocketMessage,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole("button", { name: "Confirm Word Seen" });
    await userEvent.click(btn);
    await expect(sendSocketMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GameEvent.VOTE,
        roomID: "INFO1",
        playerID: infoPlayers[0].id,
      }),
    );
  },
};
