interface Clue {
  word: string;
  playerID: string;
}

export interface ClueRound {
  clues: Clue[];
  lastSubmittedPlayerID: string;
}
