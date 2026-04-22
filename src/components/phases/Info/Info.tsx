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
  }, [
    gameContext.playerID,
    gameContext.roomCode,
    gameContext.sendSocketMessage,
  ]);

  return (
    <div className="phase-layout">
      <p className="phase-note">
        Keep your role secret. Share a smart clue later.
      </p>
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
