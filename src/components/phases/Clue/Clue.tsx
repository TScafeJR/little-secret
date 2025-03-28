import { useMemo, useContext, useState } from "react";
import { GameContext } from "../../GameState";
import { getCurrentCluePlayer } from "../../../game/player";

export default function Clue() {
  const [clue, setClue] = useState("");
  const { clues, playerID, round, players } = useContext(GameContext);

  const clueRound = useMemo(() => {
    return clues[round];
  }, [clues, round]);

  const currentPlayerTurn = useMemo(() => {
    if (!clueRound) return undefined;
    return getCurrentCluePlayer(players, clueRound);
  }, [clueRound, players]);

  const isTurn = useMemo(() => {
    return currentPlayerTurn?.id === playerID;
  }, [currentPlayerTurn, playerID]);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <h1>Clue</h1>
      {isTurn ? (
        <div className="w-full flex flex-col items-center gap-4">
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
        <h2 className="fw-text">
          Waiting for {currentPlayerTurn?.displayName} to give a clue
        </h2>
      )}
    </div>
  );
}
