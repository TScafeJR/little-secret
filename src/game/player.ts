export interface Player {
  displayName: string;
  id: string;
  confirmedVote?: boolean;
  host?: boolean;
  sortOrder?: number;
}

export const sortPlayers = (players: Player[]): Player[] => {
  return players.sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
};
