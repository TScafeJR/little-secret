import { useState, useContext, useEffect } from "react";
import { GameContext } from "../../GameState";
import { GameEvent } from "../../../game/events.ts";

interface LobbyProps {
  playerName: string;
  onSetName: (name: string) => void;
  handleLeaveGame: () => void;
}

export default function Host(p: LobbyProps) {
  const gameContext = useContext(GameContext);
  const [inputName, setInputName] = useState(p.playerName);

  useEffect(() => {
    const m = {
      type: GameEvent.PLAYER_CONNECTED,
      playerID: gameContext.playerID,
    };
    gameContext.sendSocketMessage(m);
  }, [gameContext.playerID]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2>Room Code</h2>
      <h3>
        <b>{gameContext.roomCode.toUpperCase()}</b>
      </h3>
      <input
        type="text"
        placeholder="Name"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
      />
      <div className="flex flex-col items-center gap-4">
        <button
          className="fw-button reg-button"
          onClick={() => p.onSetName(inputName)}
        >
          Set Name
        </button>
        <button className="fw-button cta-button">Start Game</button>
        <button className="fw-button red-button" onClick={p.handleLeaveGame}>
          Leave Game
        </button>
      </div>
    </div>
  );
}
