import { ClueRound } from "./clue";

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

export const getCurrentCluePlayer = (p: Player[], c: ClueRound): Player => {
  const players = sortPlayers(p);
  const currIdx = players.findIndex(
    (player) => player.id === c.lastSubmittedPlayerID,
  );
  if (currIdx + 1 >= players.length) {
    return players[players.length - 1];
  }
  return players[currIdx + 1];
};
