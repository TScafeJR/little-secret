import { useContext, useMemo, useState } from "react";
import { GameContext } from "../../GameState";

interface WordProps {
  wordSeen: boolean;
}

export default function Word(p: WordProps) {
  const [showWord, setShowWord] = useState(!p.wordSeen);
  const gameContext = useContext(GameContext);

  const displayWord = useMemo(() => {
    if (showWord || !p.wordSeen) {
      return gameContext.currentWord || "You are a spy!";
    } else {
      return "••••••••";
    }
  }, [gameContext.currentWord, showWord]);

  const toggleShowWordText = useMemo(() => {
    return showWord ? "Hide Word" : "Show Word";
  }, [showWord]);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <h3>Your Word:</h3>
      <h3 id="player-word">{displayWord}</h3>
      {p.wordSeen && (
        <button
          className="fw-button cta-button"
          id="confirm-word-btn"
          onClick={() => setShowWord((p) => !p)}
        >
          {toggleShowWordText}
        </button>
      )}
    </div>
  );
}
