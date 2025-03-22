import { GameContext } from "../../GameState";
import { useContext } from "react";

export default function CodeDisplay() {
  const gameContext = useContext(GameContext);
  return (
    <div>
      <h2>Room Code</h2>
      <h3 id="room-code">
        <b>{gameContext?.roomCode?.toUpperCase()}</b>
      </h3>
    </div>
  );
}
