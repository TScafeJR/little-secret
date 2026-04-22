import { describe, expect, it } from "vitest";
import type { ClueRound } from "./clue";
import {
  getCurrentCluePlayer,
  getFirstAlivePlayer,
  sortPlayers,
} from "./player";
import type { Player } from "./player";

const p = (id: string, name: string, alive = true): Player => ({
  id,
  displayName: name,
  alive,
  sortOrder: id.charCodeAt(0),
});

describe("getFirstAlivePlayer", () => {
  it("returns first sorted alive player", () => {
    const players = [p("c", "C"), p("a", "A"), p("b", "B")];
    expect(getFirstAlivePlayer(players).id).toBe("a");
  });
});

describe("getCurrentCluePlayer", () => {
  it("picks the first alive player when no one has submitted (empty last id)", () => {
    const players = sortPlayers([p("1", "P1"), p("2", "P2"), p("3", "P3")]);
    const cr = { clues: [], lastSubmittedPlayerID: "" } as ClueRound;
    const next = getCurrentCluePlayer(players, cr);
    expect(next.id).toBe("1");
  });

  it("rotates to the next alive player after a submission", () => {
    const players = sortPlayers([p("1", "P1"), p("2", "P2"), p("3", "P3")]);
    const cr = {
      clues: [],
      lastSubmittedPlayerID: "1",
    } as ClueRound;
    const next = getCurrentCluePlayer(players, cr);
    expect(next.id).toBe("2");
  });

  it("skips dead players", () => {
    const players = sortPlayers([
      p("1", "P1", true),
      p("2", "P2", false),
      p("3", "P3", true),
    ]);
    const cr = {
      clues: [],
      lastSubmittedPlayerID: "1",
    } as ClueRound;
    const next = getCurrentCluePlayer(players, cr);
    expect(next.id).toBe("3");
  });

  it("wraps past a dead last-submitter to the next alive player", () => {
    const players = sortPlayers([
      p("1", "P1", true),
      p("2", "P2", false),
      p("3", "P3", true),
    ]);
    const cr = {
      clues: [],
      lastSubmittedPlayerID: "2", // dead player can't actually submit, but state may linger across rounds
    } as ClueRound;
    const next = getCurrentCluePlayer(players, cr);
    expect(next.id).toBe("3");
  });
});

describe("getFirstAlivePlayer fallback", () => {
  it("returns the sorted first player when nobody is alive", () => {
    const players = sortPlayers([p("2", "P2", false), p("1", "P1", false)]);
    expect(getFirstAlivePlayer(players).id).toBe("1");
  });
});
