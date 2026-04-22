import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import Host from "../components/phases/Lobby/Host";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { GameEvent } from "../game/events";

const sendSocketMessage = fn();

const lobbyPlayers = getPlayers(4);

const meta = {
  title: "Lobby/Host",
  component: Host,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
} satisfies Meta<typeof Host>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CanStart: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: lobbyPlayers,
      roomCode: "LOBB1",
      playerID: lobbyPlayers[0].id,
      sendSocketMessage,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByRole("button", { name: "Start Game" });
    await expect(start).toBeEnabled();
    await userEvent.click(start);
    await expect(sendSocketMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GameEvent.START_GAME,
        roomID: "LOBB1",
      }),
    );
  },
};
