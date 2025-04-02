import { useMemo, useContext } from "react";
import Lobby from "./phases/Lobby/Lobby.tsx";
import { Phase } from "./phases/phases.ts";
import { GameContext } from "./GameState";
import Info from "./phases/Info/Info.tsx";
import Clue from "./phases/Clue/Clue.tsx";
import Vote from "./phases/Vote/Vote.tsx";

export default function Game() {
  const gameContext = useContext(GameContext);

  const renderPhase = useMemo(() => {
    switch (gameContext.phase) {
      case Phase.WAITING_FOR_PLAYERS:
        return <Lobby />;
      case Phase.INFO:
        return <Info />;
      case Phase.SUBMIT_CLUE:
        return <Clue />;
      case Phase.VOTE:
        return <Vote />;
      default:
        return <div>Unknown phase</div>;
    }
  }, [gameContext.phase]);

  return renderPhase;
}
