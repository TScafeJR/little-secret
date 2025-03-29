import { generate } from "random-words";
import { Player } from "../../game/player.ts";
import { ClueRound } from "../../game/clue.ts";

export function generateClues(p: Player[]): ClueRound {
  const clues = p.map((player) => {
    return {
      word: generate({ exactly: 1, minLength: 3, maxLength: 8 })[0],
      playerID: player.id,
    };
  });

  return {
    clues,
    lastSubmittedPlayerID: "",
  };
}
