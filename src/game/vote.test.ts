import { describe, it, expect } from "vitest";
import { tallyVotesByTarget, getMaxVoteCount, type VoteRound } from "./vote";

describe("vote helpers", () => {
  it("tallyVotesByTarget counts each To target", () => {
    const vr: VoteRound = {
      votes: [
        { From: "0", To: "2" },
        { From: "1", To: "2" },
        { From: "2", To: "0" },
      ],
      votedOutPlayerIDs: [],
      voteMap: {},
    };
    expect(tallyVotesByTarget(vr)).toEqual({ "2": 2, "0": 1 });
  });

  it("getMaxVoteCount is 0 for an empty tally", () => {
    expect(getMaxVoteCount({})).toBe(0);
  });

  it("getMaxVoteCount returns the top count", () => {
    expect(getMaxVoteCount({ a: 3, b: 3, c: 1 })).toBe(3);
  });
});
