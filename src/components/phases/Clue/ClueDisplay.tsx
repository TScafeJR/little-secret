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

  const body = useMemo(() => {
    if (!clueRound) return null;

    return (
      <div className="w-full flex flex-col items-center gap-4">
        <h3>Submitted Clues</h3>
        <table className="table-auto">
          <thead>
            <tr>
              <th className="border border-gray-300 px-2 py-1">Player</th>
              <th className="border border-gray-300 px-2 py-1">Clue</th>
            </tr>
          </thead>
          <tbody>
            {clueRound.clues.map((clue) => {
              const p = clueInfoToPlayer(clue.playerID);
              return (
                <tr key={p.id}>
                  <td className="border border-gray-300 px-2 py-1">
                    {p.displayName}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {clue.word}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [clueRound, clueInfoToPlayer]);

  return <div>{body}</div>;
}
