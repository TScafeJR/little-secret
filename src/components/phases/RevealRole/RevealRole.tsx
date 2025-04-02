import { useContext, useMemo, useState, useCallback } from "react";
import { GameContext } from "../../GameState";

export default function RevealRole() {
  const [guess, setGuess] = useState("");
  const [showWord, setShowWord] = useState(false);
  const gameContext = useContext(GameContext);

  const wasVotedOut = useMemo(() => {
    const voteRound = gameContext.votes[gameContext.round];
    if (!voteRound) return false;

    return voteRound.votedOutPlayerIDs.some((vID) => {
      return vID === gameContext.playerID;
    });
  }, [gameContext]);

  const isSpy = useMemo(() => {
    return gameContext.currentWord === "";
  }, [gameContext]);

  const headerText = useMemo(() => {
    if (wasVotedOut && isSpy) {
      return "You were voted out! As the spy, please enter your guess for the code word.";
    } else if (wasVotedOut) {
      return "You were voted out! Reveal the word below.";
    }

    const votedOutPlayerID =
      gameContext.votes[gameContext.round]?.votedOutPlayerIDs[0];
    const p = gameContext.players.find((p) => p.id === votedOutPlayerID);

    return `${p?.displayName} was voted out!`;
  }, [wasVotedOut, isSpy, gameContext]);

  const displayWord = useMemo(() => {
    if (showWord) {
      return gameContext.roundWord;
    } else {
      return "••••••••";
    }
  }, [gameContext.currentWord, showWord]);

  const submitGuess = useCallback(
    (guess: string) => {
      console.log("guess", guess);
    },
    [gameContext],
  );

  const toggleShowWordText = useMemo(() => {
    return showWord ? "Hide Word" : "Show Word";
  }, [showWord]);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <h3 className="text-center">{headerText}</h3>
      {isSpy && wasVotedOut && (
        <div className="w-full flex flex-col items-center gap-4">
          <input
            type="text"
            placeholder="Guess"
            className="base-input center-text"
            id="guess-input"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            autoFocus
          />
          <button
            disabled={!guess}
            className="fw-button reg-button"
            id="player-clue-submit"
            onClick={() => {
              submitGuess(guess);
            }}
          >
            Submit Guess
          </button>
        </div>
      )}
      {!isSpy && wasVotedOut && (
        <div className="w-full flex flex-col items-center gap-4">
          <h3 id="player-word">{displayWord}</h3>
          <button
            className="fw-button reg-button"
            id="confirm-word-btn"
            onClick={() => setShowWord((p) => !p)}
          >
            {toggleShowWordText}
          </button>
        </div>
      )}
    </div>
  );
}
