import type { Meta, StoryObj } from "@storybook/react";
import Word from "../components/phases/Info/Word";
import { GameStateDecorator, baseContext } from "./GameStateMock";
import { Player as PlayerType } from "../game/player";

const meta = {
  title: "Lobby/Word",
  component: Word,
  tags: ["autodocs"],
  decorators: [GameStateDecorator],
  args: {
    wordSeen: false,
  },
} satisfies Meta<typeof Word>;

export default meta;

type Story = StoryObj<typeof meta>;

const baseStory: Story = {
  parameters: {
    layout: "centered",
    context: {
      ...baseContext,
      players: [
        { id: "1", displayName: "Ty", confirmedVote: true, host: true },
        { id: "2", displayName: "nugget", confirmedVote: false },
        { id: "3", displayName: "Berlinnnnn", confirmedVote: false },
      ],
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
    },
  },
};

export const Player: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      currentWord: "word",
    },
  },
};

export const Host: Story = {
  ...baseStory,
  parameters: {
    ...baseStory.parameters,
    context: {
      ...baseStory.parameters?.context,
      players: baseStory.parameters?.context?.players?.map((p: PlayerType) => ({
        ...p,
        confirmedVote: true,
      })),
      currentWord: "word",
      playerID: "1",
    },
  },
};
