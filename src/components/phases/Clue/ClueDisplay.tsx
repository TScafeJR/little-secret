import { useMemo, useContext, useCallback } from "react";
import { GameContext } from "../../GameState";
import { Player } from "../../../game/player";

export default function ClueDisplay() {
  const { clues, round, players } = useContext(GameContext);

  const clueRound = useMemo(() => {
    return clues[round];
  }, [clues, round]);

  const clueInfoToPlayer = useCallback(
    (pID: string): Player => {
      return players.find((p) => p.id === pID) as Player;
    },
    [players],
  );

  const submittedCount = clueRound?.clues.length ?? 0;

  const body = useMemo(() => {
    if (!clueRound || clueRound.clues.length === 0) {
      return (
        <p className="clue-display-empty">
          No clues submitted yet for this round.
        </p>
      );
    }

    return (
      <table className="clue-display-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Clue</th>
          </tr>
        </thead>
        <tbody>
          {clueRound.clues.map((clue) => {
            const player = clueInfoToPlayer(clue.playerID);
            return (
              <tr key={`${clue.playerID}-${clue.word}`}>
                <td>{player?.displayName ?? "Unknown player"}</td>
                <td className="clue-word">{clue.word}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }, [clueRound, clueInfoToPlayer]);

  return (
    <section className="clue-display-card" aria-label="Submitted clues">
      <div className="clue-display-header">
        <h3 className="clue-display-title">Submitted Clues</h3>
        <span className="clue-count-chip">
          {submittedCount} {submittedCount === 1 ? "clue" : "clues"}
        </span>
      </div>
      {body}
    </section>
  );
}
