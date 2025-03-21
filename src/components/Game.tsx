import { useMemo, useContext } from "react";
import Lobby from "./phases/Lobby/Lobby.tsx";
import { Phase } from "./phases/phases.ts";
import { GameContext } from "./GameState";

export default function Game() {
  const gameContext = useContext(GameContext);
  const renderPhase = useMemo(() => {
    switch (gameContext.phase) {
      case Phase.WAITING_FOR_PLAYERS:
        return <Lobby />;
      default:
        return <div>Unknown phase</div>;
    }
  }, [gameContext]);

  return renderPhase;
}
