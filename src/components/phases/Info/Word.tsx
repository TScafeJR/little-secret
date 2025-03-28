import { useContext, useMemo, useState } from "react";
import { GameContext } from "../../GameState";
import WaitingForPlayers from "./WaitingForPlayers.tsx";
import usePlayerInfo from "../../hooks/usePlayerInfo.tsx";

interface WordProps {
  wordSeen: boolean;
}

export default function Word(p: WordProps) {
  const [showWord, setShowWord] = useState(!p.wordSeen);
  const gameContext = useContext(GameContext);
  const playerInfo = usePlayerInfo();

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

  const showStartGameButton = useMemo(() => {
    return (
      p.wordSeen &&
      playerInfo.isHost &&
      gameContext.players.every((p) => p.confirmedVote)
    );
  }, [gameContext.players, playerInfo.isHost, p.wordSeen]);

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
      {showStartGameButton && (
        <button className="fw-button cta-button" id="start-game-btn">
          Start Game
        </button>
      )}
    </div>
  );
}
