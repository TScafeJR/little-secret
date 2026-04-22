import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import RevealRole from "../components/phases/RevealRole/RevealRole";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { GameEvent } from "../game/events";

const players = getPlayers(5);

const meta = {
  title: "RevealRole/RevealRole",
  component: RevealRole,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
} satisfies Meta<typeof RevealRole>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseStory: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: players,
      round: 1,
      playerID: players[0].id,
      currentWord: "word",
    },
  },
};

export const Spy: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      currentWord: "",
      votes: {
        "1": {
          votedOutPlayerIDs: [players[0].id],
        },
      },
    },
  },
};

export const Confused: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      currentWord: "paragraph",
      votes: {
        "1": {
          votedOutPlayerIDs: [players[0].id],
        },
      },
      roundWord: baseStory.parameters?.context.currentWord,
    },
  },
};

export const Other: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      currentWord: "",
      votes: {
        "1": {
          votedOutPlayerIDs: [players[1].id],
        },
      },
    },
  },
};

const sendReveal = fn();

export const SpectatorClicksContinue: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      currentWord: "",
      roomCode: "REV1",
      sendSocketMessage: sendReveal,
      votes: {
        "1": {
          votedOutPlayerIDs: [players[1].id],
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }));
    await expect(sendReveal).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GameEvent.ROLE_CONFIRMED,
        text: "",
        roomID: "REV1",
        playerID: players[0].id,
      }),
    );
  },
};

export const TieBreakNote: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      currentWord: "word",
      votes: {
        "1": {
          votedOutPlayerIDs: [players[1].id],
          tiedPlayerIDs: [players[1].id, players[2].id],
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/tie between/i)).toBeInTheDocument();
  },
};

const sendSpyGuess = fn();

export const SpySubmitsGuess: Story = {
  ...Spy,
  parameters: {
    ...Spy.parameters,
    context: {
      ...Spy.parameters?.context,
      roomCode: "REV2",
      sendSocketMessage: sendSpyGuess,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByPlaceholderText("Guess"), "lighthouse");
    await userEvent.click(canvas.getByRole("button", { name: "Submit Guess" }));
    await expect(sendSpyGuess).toHaveBeenCalledWith(
      expect.objectContaining({
        type: GameEvent.ROLE_CONFIRMED,
        text: "lighthouse",
        roomID: "REV2",
        playerID: players[0].id,
      }),
    );
  },
};
