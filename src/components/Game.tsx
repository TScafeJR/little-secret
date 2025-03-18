import { useMemo, useContext } from "react";
import Lobby from "./phases/Lobby/Lobby.tsx";
import { Phase } from "./phases/phases.ts";
import GameStateProvider from "./GameStateProvider.tsx";
import { GameContext } from "./GameState";

export default function Game() {
  const gameContext = useContext(GameContext);
  const renderPhase = useMemo(() => {
    switch (gameContext.phase) {
      case Phase.WAITING_FOR_PLAYERS:
        return (
          <Lobby
            playerName={gameContext.playerName}
            onSetName={gameContext.updatePlayerName}
          />
        );
      default:
        return <div>Unknown phase</div>;
    }
  }, [gameContext.phase, gameContext.playerName]);

  return <GameStateProvider>{renderPhase}</GameStateProvider>;
}
