import { useMemo, useContext, useState, useEffect, useCallback } from "react";
import { GameContext } from "../../GameState";
import {
  getCurrentCluePlayer,
  getFirstAlivePlayer,
} from "../../../game/player";
import ClueDisplay from "./ClueDisplay";
import { GameEvent } from "../../../game/events";

export default function Clue() {
  const [clue, setClue] = useState("");
  const [dotCount, setDotCount] = useState(0);
  const gameContext = useContext(GameContext);

  const clueRound = useMemo(() => {
    return gameContext.clues[gameContext.round];
  }, [gameContext.clues, gameContext.round]);

  const isSpectator = useMemo(() => {
    const me = gameContext.players.find((p) => p.id === gameContext.playerID);
    return me ? me.alive === false : false;
  }, [gameContext.players, gameContext.playerID]);

  const currentPlayerTurn = useMemo(() => {
    if (!clueRound) return getFirstAlivePlayer(gameContext.players);
    return getCurrentCluePlayer(gameContext.players, clueRound);
  }, [clueRound, gameContext.players]);

  const isTurn = useMemo(() => {
    return currentPlayerTurn?.id === gameContext.playerID;
  }, [currentPlayerTurn, gameContext.playerID]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const submissionButtonDisabled = useMemo(() => {
    if (!isTurn) return true;
    if (!clue) return true;
    return false;
  }, [isTurn, clue]);

  const submitClue = useCallback(
    (clue: string) => {
      gameContext.sendSocketMessage({
        type: GameEvent.SUBMIT_CLUE,
        text: clue,
        roomID: gameContext.roomCode,
        playerID: gameContext.playerID,
      });
      setClue("");
    },
    [
      gameContext,
      gameContext.roomCode,
      gameContext.playerID,
      gameContext.sendSocketMessage,
      setClue,
    ],
  );

  if (isSpectator) {
    return (
      <div className="phase-layout">
        <h1>Clue</h1>
        <h3 id="spectator-banner" className="fw-text text-center">
          You've been eliminated — watch the rest of the round.
        </h3>
        <ClueDisplay />
      </div>
    );
  }

  return (
    <div className="phase-layout">
      <h1>Clue</h1>
      {isTurn ? (
        <div className="phase-layout">
          <h3>It's your turn to submit a clue</h3>
          <input
            type="text"
            placeholder="Clue"
            className="base-input center-text"
            id="clue-input"
            value={clue}
            onChange={(e) => setClue(e.target.value)}
            autoFocus
          />
          <button
            disabled={submissionButtonDisabled}
            className="fw-button reg-button"
            id="player-clue-submit"
            onClick={() => {
              submitClue(clue);
            }}
          >
            Submit Clue
          </button>
        </div>
      ) : (
        <h3 className="fw-text text-center">
          Waiting for {currentPlayerTurn?.displayName} to give a clue this round
          {".".repeat(dotCount)}
        </h3>
      )}
      <ClueDisplay />
    </div>
  );
}
