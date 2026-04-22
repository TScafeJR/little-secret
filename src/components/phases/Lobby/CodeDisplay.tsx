import { GameContext } from "../../GameState";
import { useContext } from "react";

export default function CodeDisplay() {
  const gameContext = useContext(GameContext);
  return (
    <div className="phase-layout">
      <p className="phase-note">Room code</p>
      <h2 id="room-code">
        <b>{gameContext?.roomCode?.toUpperCase()}</b>
      </h2>
    </div>
  );
}
