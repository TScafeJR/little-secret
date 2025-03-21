import { useContext } from "react";
import { GameContext } from "../GameState";

interface PlayerContext {
  playerName: string;
  playerID: string;
}

export default function PlayerInfo(): PlayerContext {
  const gameContext = useContext(GameContext);

  return {
    playerName: gameContext.playerName,
    playerID: gameContext.playerID,
  };
}
