import { createContext } from "react";
import { Phase } from "./phases/phases.ts";
import { OutboundMessage } from "../game/message.ts";
import { Player } from "../game/player.ts";

export interface GameContextType {
  phase: Phase;
  playerName: string;
  roomCode: string;
  sendSocketMessage: (m: OutboundMessage) => void;
  playerID: string;
  players: Player[];
  clearRoomCode: () => void;
}

export const GameContext = createContext<GameContextType>({
  phase: Phase.WAITING_FOR_PLAYERS,
  playerName: "",
  roomCode: "",
  sendSocketMessage: (_: OutboundMessage) => {},
  playerID: "",
  players: [],
  clearRoomCode: () => {},
});
