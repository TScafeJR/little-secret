import type { Meta, StoryObj } from "@storybook/react";
import RevealRole from "../components/phases/RevealRole/RevealRole";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";

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
