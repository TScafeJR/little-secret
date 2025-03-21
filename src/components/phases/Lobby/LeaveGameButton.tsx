import { useContext } from "react";
import { LobbyContext } from "./LobbyContext";

export default function LeaveGameButton() {
  const lobbyContext = useContext(LobbyContext);

  return (
    <button className="fw-button red-button" onClick={lobbyContext.leaveGame}>
      Leave Game
    </button>
  );
}
