import { useContext, useState, useCallback } from "react";
import { GameContext } from "../../GameState";
import usePlayerInfo from "../../hooks/usePlayerInfo";
import { GameEvent } from "../../../game/events";

export default function NameSubmission() {
  const gameContext = useContext(GameContext);
  const [playerName, setPlayerName] = useState(gameContext.playerName);
  const playerInfo = usePlayerInfo();

  const handleNameSubmission = useCallback(
    (c: string) => {
      const m = {
        playerID: playerInfo.playerID,
        text: c,
        type: GameEvent.UPDATE_PLAYER_NAME,
        roomID: gameContext.roomCode,
      };
      gameContext.sendSocketMessage(m);
    },
    [gameContext.sendSocketMessage, gameContext.roomCode],
  );

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <input
        type="text"
        placeholder="Name"
        className="base-input center-text"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        autoFocus
      />
      <button
        className="fw-button reg-button"
        onClick={() => handleNameSubmission(playerName)}
      >
        Set Name
      </button>
    </div>
  );
}
