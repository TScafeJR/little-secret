import { ClueRound } from "./clue";

export interface Player {
  displayName: string;
  id: string;
  confirmedVote?: boolean;
  host?: boolean;
  sortOrder?: number;
  alive?: boolean;
}

export const sortPlayers = (players: Player[]): Player[] => {
  return players.sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
};

export const getCurrentCluePlayer = (p: Player[], c: ClueRound): Player => {
  const players = sortPlayers(p);
  const index = players.findIndex((pl) => pl.id === c.lastSubmittedPlayerID);
  const total = players.length;

  for (let i = 1; i <= total; i++) {
    const next = players[(index + i) % total];
    if (next.alive) return next;
  }

  return players.find((pl) => pl.id === c.lastSubmittedPlayerID)!;
};

export const getFirstAlivePlayer = (p: Player[]): Player => {
  const players = sortPlayers(p);
  return players.find((pl) => pl.alive) || players[0];
};
