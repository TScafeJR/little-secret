import { useContext } from "react";
import { GameContext } from "../../GameState";
import Players from "./Players.tsx";
import NameSubmission from "./NameSubmission.tsx";
import CodeSubmission from "./CodeSubmission.tsx";
import LeaveGameButton from "./LeaveGameButton.tsx";

export default function Player() {
  const gameContext = useContext(GameContext);

  const hasCode = gameContext.roomCode !== "";

  return (
    <div className="w-full flex items-center gap-4">
      {hasCode && (
        <div>
          <h2>Room Code</h2>
          <h3>
            <b>{gameContext.roomCode.toUpperCase()}</b>
          </h3>
          <Players />
          <NameSubmission />
        </div>
      )}
      {!hasCode && <CodeSubmission />}
      <LeaveGameButton />
    </div>
  );
}
