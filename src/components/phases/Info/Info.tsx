import { useContext } from "react";
import { GameContext } from "../../GameState";

export default function Info() {
  const gameContext = useContext(GameContext);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <h3>Your Word:</h3>
      <h3 id="player-word">{gameContext.currentWord}</h3>
      <button className="fw-button cta-button" id="confirm-word-btn">
        Confirm Word Seen
      </button>
    </div>
  );
}
