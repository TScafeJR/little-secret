import { describe, it, expect } from "vitest";
import {
  getClueRoundForRound,
  clueCountInRound,
  getClueTexts,
  type ClueRound,
} from "./clue";

const sampleRound1: ClueRound = {
  lastSubmittedPlayerID: "0",
  clues: [
    { word: "alpha", playerID: "0" },
    { word: "beta", playerID: "1" },
  ],
};

describe("clue round helpers", () => {
  it("getClueRoundForRound returns the entry for a numeric key", () => {
    const clues: Record<number, ClueRound | undefined> = {
      0: { clues: [], lastSubmittedPlayerID: "" },
      1: sampleRound1,
    };
    expect(getClueRoundForRound(clues, 1)).toBe(sampleRound1);
    expect(getClueRoundForRound(clues, 2)).toBeUndefined();
  });

  it("clueCountInRound and getClueTexts match the current round", () => {
    expect(clueCountInRound(sampleRound1)).toBe(2);
    expect(getClueTexts(sampleRound1)).toEqual(["alpha", "beta"]);
  });
});
