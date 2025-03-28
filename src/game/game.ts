import { ClueRound } from "./clue";
import { Player } from "./player";
import { Phase } from "../components/phases/phases";

export interface GameState {
  players: Player[];
  phase: Phase;
  clues: Record<number, ClueRound>;
  round: number;
}
