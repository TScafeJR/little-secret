interface Clue {
  word: string;
  playerID: string;
}

export interface ClueRound {
  clues: Clue[];
  lastSubmittedPlayerID: string;
}

/** Clue round for the given game round, or undefined if the server has not created one yet. */
export function getClueRoundForRound(
  clues: Record<number, ClueRound | undefined>,
  round: number,
): ClueRound | undefined {
  return clues[round];
}

/** How many clue cards have been collected for this round. */
export function clueCountInRound(cr: ClueRound): number {
  return cr.clues.length;
}

/** All clue texts in order (useful for duplicate detection at the call site). */
export function getClueTexts(cr: ClueRound): string[] {
  return cr.clues.map((c) => c.word);
}
