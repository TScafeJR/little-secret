interface Vote {
  From: string;
  To: string;
}

export interface VoteRound {
  votes: Vote[];
  votedOutPlayerIDs: string[];
  tiedPlayerIDs?: string[];
  voteMap: Record<string, string>;
}

/** Tally: target player id -> number of incoming votes. */
export function tallyVotesByTarget(vr: VoteRound): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const v of vr.votes) {
    if (!tally[v.To]) {
      tally[v.To] = 0;
    }
    tally[v.To] += 1;
  }
  return tally;
}

export function getMaxVoteCount(tally: Record<string, number>): number {
  return Math.max(0, ...Object.values(tally));
}
