import { useContext, useMemo, useState, useCallback } from "react";
import { GameContext } from "../../GameState";
import { GameEvent } from "../../../game/events.ts";

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
  }, [gameContext.votes, gameContext.round, gameContext.playerID]);

  const isSpy = useMemo(() => {
    return gameContext.currentWord === "";
  }, [gameContext.currentWord]);

  const sendRoleConfirmed = useCallback(
    (text: string) => {
      gameContext.sendSocketMessage({
        type: GameEvent.ROLE_CONFIRMED,
        playerID: gameContext.playerID,
        roomID: gameContext.roomCode,
        text,
      });
    },
    [gameContext.sendSocketMessage, gameContext.playerID, gameContext.roomCode],
  );

  const tieNote = useMemo(() => {
    const voteRound = gameContext.votes[gameContext.round];
    const tied = voteRound?.tiedPlayerIDs ?? [];
    if (tied.length < 2) return null;
    const names = tied
      .map(
        (pid) =>
          gameContext.players.find((p) => p.id === pid)?.displayName ?? pid,
      )
      .join(", ");
    const picked = voteRound?.votedOutPlayerIDs[0];
    const pickedName =
      gameContext.players.find((p) => p.id === picked)?.displayName ?? picked;
    return `Tie between ${names} — ${pickedName} was picked.`;
  }, [gameContext.votes, gameContext.round, gameContext.players]);

  const headerText = useMemo(() => {
    if (wasVotedOut && isSpy) {
      return "You were voted out! As the spy, please enter your guess for the code word.";
    } else if (wasVotedOut) {
      return "You were voted out! Reveal the word below.";
    }

    const votedOutPlayerID =
      gameContext.votes[gameContext.round]?.votedOutPlayerIDs[0];
    const p = gameContext.players.find((p) => p.id === votedOutPlayerID);

    return `${p?.displayName ?? "Someone"} was voted out!`;
  }, [wasVotedOut, isSpy, gameContext]);

  const displayWord = useMemo(() => {
    if (showWord) {
      return gameContext.roundWord;
    } else {
      return "••••••••";
    }
  }, [gameContext.roundWord, showWord]);

  const submitGuess = useCallback(
    (g: string) => {
      sendRoleConfirmed(g);
      setGuess("");
    },
    [sendRoleConfirmed],
  );

  const toggleShowWordText = useMemo(() => {
    return showWord ? "Hide Word" : "Show Word";
  }, [showWord]);

  const showContinue = !wasVotedOut || (wasVotedOut && !isSpy);

  return (
    <div className="phase-layout">
      <h3 className="text-center">{headerText}</h3>
      {tieNote && (
        <p id="tie-note" className="text-center">
          {tieNote}
        </p>
      )}
      {isSpy && wasVotedOut && (
        <div className="phase-layout">
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
            id="spy-guess-submit"
            type="button"
            onClick={() => {
              submitGuess(guess);
            }}
          >
            Submit Guess
          </button>
        </div>
      )}
      {!isSpy && wasVotedOut && (
        <div className="phase-layout">
          <h3 id="player-word">{displayWord}</h3>
          <button
            type="button"
            className="fw-button reg-button"
            id="reveal-toggle-word-btn"
            onClick={() => setShowWord((p) => !p)}
          >
            {toggleShowWordText}
          </button>
        </div>
      )}
      {showContinue && (
        <button
          type="button"
          className="fw-button cta-button"
          id="reveal-continue-btn"
          onClick={() => sendRoleConfirmed("")}
        >
          Continue
        </button>
      )}
    </div>
  );
}
