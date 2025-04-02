import { ClueRound } from "./clue";
import { Player } from "./player";
import { Phase } from "../components/phases/phases";
import { VoteRound } from "./vote";

export interface GameState {
  players: Player[];
  phase: Phase;
  clues: Record<number, ClueRound>;
  round: number;
  votes: Record<number, VoteRound>;
}
