import { useState, useContext } from "react";
import { GameContext } from "../../GameState";

interface LobbyProps {
  playerName: string;
  onSetName: (name: string) => void;
  handleLeaveGame: () => void;
}

export default function Player(p: LobbyProps) {
  const gameContext = useContext(GameContext);
  const [inputName, setInputName] = useState(p.playerName);

  const hasCode = gameContext.roomCode !== "";

  return (
    <div className="flex flex-col items-center gap-4">
      {hasCode && <h2>Room Code</h2>}
      {hasCode && (
        <h3>
          <b>{gameContext.roomCode.toUpperCase()}</b>
        </h3>
      )}
      <input
        type="text"
        placeholder="Name"
        className="base-input"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
      />
      <input type="text" placeholder="Room Code" className="base-input" />
      <div className="w-full flex flex-col items-center gap-4">
        <button
          className="fw-button reg-button"
          onClick={() => p.onSetName(inputName)}
        >
          Set Name
        </button>
        <button className="fw-button red-button" onClick={p.handleLeaveGame}>
          Leave Game
        </button>
      </div>
    </div>
  );
}
