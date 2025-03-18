import { createContext } from "react";
import { Phase } from "./phases/phases.ts";
import { Message } from "../game/message.ts";

export interface GameContextType {
  phase: Phase;
  playerName: string;
  updatePlayerName: (name: string) => void;
  roomCode: string;
  sendSocketMessage: (m: Message) => void;
  playerID: string;
}

export const GameContext = createContext<GameContextType>({
  phase: Phase.WAITING_FOR_PLAYERS,
  playerName: "",
  updatePlayerName: (_: string) => {},
  roomCode: "",
  sendSocketMessage: (_: Message) => {},
  playerID: "1234",
});
