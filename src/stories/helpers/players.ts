import { Player } from "../../game/player.ts";

function createPlayer(p: Player): Player {
  return {
    id: p.id ?? "",
    displayName: p.displayName ?? "Anonymous",
    confirmedVote: p.confirmedVote ?? false,
    host: p.host ?? false,
    alive: p.alive ?? true,
  };
}

export function getPlayers(n: number): Player[] {
  if (n > 8 || n < 4) {
    throw new Error("Invalid number of players");
  }

  const players: Player[] = [];

  for (let i = 0; i < n; i++) {
    const p = {
      id: i.toString(),
      displayName: "",
      confirmedVote: false,
      host: false,
      sortOrder: i,
      alive: true,
    };

    switch (i) {
      case 0:
        p.displayName = "Ty";
        p.host = true;
        break;
      case 1:
        p.displayName = "nugget";
        break;
      case 2:
        p.displayName = "Berlinnnnn";
        break;
      default:
    }

    const c = createPlayer(p);
    players.push(c);
  }

  return players.slice(0, n);
}
