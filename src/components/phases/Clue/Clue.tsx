import { useMemo, useContext, useState, useEffect } from "react";
import { GameContext } from "../../GameState";
import {
  getCurrentCluePlayer,
  getFirstAlivePlayer,
} from "../../../game/player";

export default function Clue() {
  const [clue, setClue] = useState("");
  const [dotCount, setDotCount] = useState(0);
  const { clues, playerID, round, players } = useContext(GameContext);

  const clueRound = useMemo(() => {
    return clues[round];
  }, [clues, round]);

  const currentPlayerTurn = useMemo(() => {
    if (!clueRound) return getFirstAlivePlayer(players);
    return getCurrentCluePlayer(players, clueRound);
  }, [clueRound, players]);

  const isTurn = useMemo(() => {
    return currentPlayerTurn?.id === playerID;
  }, [currentPlayerTurn, playerID]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <h1>Clue</h1>
      {isTurn ? (
        <div className="w-full flex flex-col items-center gap-4">
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
          <button className="fw-button reg-button" id="player-clue-submit">
            Set Name
          </button>
        </div>
      ) : (
        <h3 className="fw-text text-center">
          Waiting for {currentPlayerTurn?.displayName} to give a clue this round
          {".".repeat(dotCount)}
        </h3>
      )}
    </div>
  );
}
