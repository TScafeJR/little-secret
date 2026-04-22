import { createContext } from "react";
import { Phase } from "./phases/phases.ts";
import { OutboundMessage } from "../game/message.ts";
import { Player } from "../game/player.ts";
import { ClueRound } from "../game/clue.ts";
import { VoteRound } from "../game/vote.ts";
import { GameResult } from "../game/game.ts";

export interface GameContextType {
  phase: Phase;
  playerName: string;
  roomCode: string;
  sendSocketMessage: (m: OutboundMessage) => void;
  updatePlayerName: (name: string) => void;
  playerID: string;
  players: Player[];
  clearRoomCode: () => void;
  currentWord: string;
  clues: Record<number, ClueRound | undefined>;
  round: number;
  votes: Record<number, VoteRound | undefined>;
  roundWord: string;
  gameResult: GameResult | null;
}

export const GameContext = createContext<GameContextType>({
  phase: Phase.WAITING_FOR_PLAYERS,
  currentWord: "",
  playerName: "",
  roomCode: "",
  sendSocketMessage: () => {},
  updatePlayerName: () => {},
  playerID: "",
  players: [],
  clearRoomCode: () => {},
  clues: {},
  round: 0,
  votes: {},
  roundWord: "",
  gameResult: null,
});
