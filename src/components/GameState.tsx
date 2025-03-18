import { createContext } from "react";
import { Phase } from "./phases/phases.ts";
import { Message } from "../game/message.ts";
import { Player } from "../game/player.ts";

export interface GameContextType {
  phase: Phase;
  playerName: string;
  updatePlayerName: (name: string) => void;
  roomCode: string;
  sendSocketMessage: (m: Message) => void;
  playerID: string;
  players: Player[];
  clearRoomCode: () => void;
}

export const GameContext = createContext<GameContextType>({
  phase: Phase.WAITING_FOR_PLAYERS,
  playerName: "",
  updatePlayerName: (_: string) => {},
  roomCode: "",
  sendSocketMessage: (_: Message) => {},
  playerID: "",
  players: [],
  clearRoomCode: () => {},
});
