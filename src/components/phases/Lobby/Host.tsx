import { useContext, useEffect } from "react";
import { GameContext } from "../../GameState";
import { GameEvent } from "../../../game/events.ts";
import Players from "./Players.tsx";
import NameSubmission from "./NameSubmission.tsx";
import LeaveGameButton from "./LeaveGameButton.tsx";

export default function Host() {
  const gameContext = useContext(GameContext);

  useEffect(() => {
    if (gameContext.roomCode === "") {
      const m = {
        type: GameEvent.CREATE_ROOM,
        playerID: gameContext.playerID,
      };

      gameContext.sendSocketMessage(m);
    }
  }, [gameContext]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2>Room Code</h2>
      <h3 id="room-code">
        <b>{gameContext.roomCode.toUpperCase()}</b>
      </h3>
      <Players />
      <div className="w-full flex flex-col items-center justify-items-end gap-4">
        <NameSubmission />
        <button className="fw-button cta-button">Start Game</button>
        <LeaveGameButton />
      </div>
    </div>
  );
}
