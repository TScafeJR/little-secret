import { useContext, useMemo } from "react";
import { GameContext } from "../GameState";

interface PlayerContext {
  playerName: string;
  playerID: string;
  isHost: boolean;
}

export default function PlayerInfo(): PlayerContext {
  const gameContext = useContext(GameContext);

  const isHost = useMemo(() => {
    return (
      gameContext.players.find((p) => p.id === gameContext.playerID)?.host ||
      false
    );
  }, [gameContext.players]);

  return {
    playerName: gameContext.playerName,
    playerID: gameContext.playerID,
    isHost,
  };
}
