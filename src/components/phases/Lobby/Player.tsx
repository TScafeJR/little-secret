import { useContext } from "react";
import { GameContext } from "../../GameState";
import Players from "./Players.tsx";
import NameSubmission from "./NameSubmission.tsx";
import CodeSubmission from "./CodeSubmission.tsx";
import LeaveGameButton from "./LeaveGameButton.tsx";
import CodeDisplay from "./CodeDisplay.tsx";

export default function Player() {
  const gameContext = useContext(GameContext);

  const hasCode = gameContext.roomCode !== "";

  return (
    <div className="phase-layout">
      {hasCode && <CodeDisplay />}
      {hasCode && <Players />}
      {hasCode && <NameSubmission />}
      {!hasCode && <CodeSubmission />}
      <LeaveGameButton />
    </div>
  );
}
