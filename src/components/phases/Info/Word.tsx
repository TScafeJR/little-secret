import { useContext, useMemo, useState, useEffect } from "react";
import { GameContext } from "../../GameState";
import WaitingForPlayers from "../../game/WaitingForPlayers.tsx";

interface WordProps {
  wordSeen: boolean;
}

export default function Word(p: WordProps) {
  const [showWord, setShowWord] = useState(!p.wordSeen);
  const gameContext = useContext(GameContext);

  // this is a one time effect
  useEffect(() => {
    if (p.wordSeen) {
      setShowWord(false);
    }
  }, [p.wordSeen]);

  const displayWord = useMemo(() => {
    if (showWord) {
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
      <WaitingForPlayers />
      {p.wordSeen && (
        <button
          className="fw-button reg-button"
          id="confirm-word-btn"
          onClick={() => setShowWord((p) => !p)}
        >
          {toggleShowWordText}
        </button>
      )}
    </div>
  );
}
