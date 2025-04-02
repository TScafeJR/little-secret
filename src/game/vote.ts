interface Vote {
  From: string;
  To: string;
}

export interface VoteRound {
  votes: Vote[];
  votedOutPlayerIDs: string[];
  voteMap: Record<string, string>;
}
