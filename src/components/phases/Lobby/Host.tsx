import { useState, useContext, useEffect } from "react";
import { GameContext } from "../../GameState";
import { GameEvent } from "../../../game/events.ts";
import Players from "./Players.tsx";

interface HostProps {
  playerName: string;
  onSetName: (name: string) => void;
  handleLeaveGame: () => void;
}

export default function Host(p: HostProps) {
  const gameContext = useContext(GameContext);
  const [inputName, setInputName] = useState(p.playerName);

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
      <h3>
        <b>{gameContext.roomCode.toUpperCase()}</b>
      </h3>
      <Players />
      <input
        type="text"
        placeholder="Name"
        className="base-input center-text"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
      />
      <div className="w-full flex flex-col items-center gap-4">
        <button
          className="fw-button reg-button"
          onClick={() => p.onSetName(inputName)}
        >
          Set Name
        </button>
        <button className="fw-button cta-button">Start Game</button>
        <button
          className="fw-button red-button"
          onClick={() => {
            p.handleLeaveGame();
            gameContext.clearRoomCode();
          }}
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}
