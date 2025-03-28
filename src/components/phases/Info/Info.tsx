import { useState, useCallback, useContext } from "react";
import Word from "./Word.tsx";
import { GameContext } from "../../GameState";
import { GameEvent } from "../../../game/events";

export default function Info() {
  const gameContext = useContext(GameContext);
  const [wordSeen, setWordSeen] = useState(false);

  const handleWordSeenClick = useCallback(() => {
    setWordSeen(true);
    gameContext.sendSocketMessage({
      playerID: gameContext.playerID,
      roomID: gameContext.roomCode,
      type: GameEvent.VOTE,
    });
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <Word wordSeen={wordSeen} />
      {!wordSeen && (
        <button
          className="fw-button cta-button"
          id="confirm-word-btn"
          onClick={handleWordSeenClick}
        >
          Confirm Word Seen
        </button>
      )}
    </div>
  );
}
