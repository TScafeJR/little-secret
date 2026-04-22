import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import GameOver from "../components/phases/GameOver/GameOver";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { GameEvent } from "../game/events";

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

export const SpyWinByGuess: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: endPlayers,
      gameResult: {
        reason: "spyGuessedWord",
        winningRoles: ["spyKitten"],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/spy pup wins/i)).toBeInTheDocument();
  },
};

export const ImpostersSurvived: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: endPlayers.map((p, i) => ({
        ...p,
        alive: i !== 0,
      })),
      gameResult: {
        reason: "impostersSurvived",
        winningRoles: ["confusedKitten", "spyKitten"],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/impostors stayed hidden/i),
    ).toBeInTheDocument();
  },
};

export const TwoPlayersLeft: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: endPlayers.map((p, i) => ({
        ...p,
        alive: i < 2,
      })),
      gameResult: {
        reason: "twoPlayersLeft",
        winningRoles: ["confusedKitten"],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/only two players remain/i),
    ).toBeInTheDocument();
  },
};

const sendLeave = fn();
const clearRoomCode = fn();

export const LeaveRoom: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      roomCode: "GAMEO",
      playerID: endPlayers[0].id,
      players: endPlayers,
      clearRoomCode,
      sendSocketMessage: sendLeave,
      gameResult: {
        reason: "allImpostersOut",
        winningRoles: ["goodKitten"],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Leave Room" }));
    await expect(clearRoomCode).toHaveBeenCalled();
    await expect(sendLeave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GameEvent.REMOVE_PLAYER,
        roomID: "GAMEO",
        playerID: endPlayers[0].id,
      }),
    );
  },
};
