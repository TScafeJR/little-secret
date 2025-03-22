import { useState, useCallback, useContext } from "react";
import { GameContext } from "../../GameState";
import { GameEvent } from "../../../game/events.ts";
import usePlayerInfo from "../../hooks/usePlayerInfo.tsx";

export default function CodeSubmission() {
  const gameContext = useContext(GameContext);
  const playerInfo = usePlayerInfo();
  const [code, setCode] = useState("");

  const handleCodeSubmission = useCallback((c: string) => {
    const m = {
      type: GameEvent.SUBMIT_CODE,
      text: c.toUpperCase(),
      playerID: playerInfo.playerID,
    };

    gameContext.sendSocketMessage(m);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <input
        type="text"
        placeholder="Room Code"
        className="base-input center-text uppercase"
        value={code}
        id="room-code-input"
        onChange={(e) => setCode(e.target.value)}
        autoFocus
      />
      <button
        type="submit"
        className="fw-button reg-button"
        onClick={() => handleCodeSubmission(code)}
      >
        Submit Code
      </button>
    </div>
  );
}
