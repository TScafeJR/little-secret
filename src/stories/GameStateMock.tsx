import React from "react";
import type { StoryContext } from "@storybook/react";
import { GameContextType, GameContext } from "../components/GameState";
import { Phase } from "../components/phases/phases";
import { OutboundMessage } from "../game/message";

interface GameStateMockProps {
  state: GameContextType;
  children: React.ReactNode;
}

export const GameStateMock = (p: GameStateMockProps) => {
  return (
    <GameContext.Provider value={p.state}>{p.children}</GameContext.Provider>
  );
};

export const GameStateDecorator = (
  Story: () => React.JSX.Element,
  context: StoryContext,
) => {
  const gameContext = context.parameters.context as GameContextType;

  return (
    <GameStateMock state={gameContext}>
      <Story />
    </GameStateMock>
  );
};

export const baseContext = {
  players: [],
  phase: Phase.WAITING_FOR_PLAYERS,
  currentWord: "",
  playerName: "",
  roomCode: "",
  sendSocketMessage: (_: OutboundMessage) => {},
  playerID: "",
  clearRoomCode: () => {},
};
