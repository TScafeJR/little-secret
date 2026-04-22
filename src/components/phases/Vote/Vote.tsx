import { useMemo, useContext, useState, useCallback } from "react";
import { GameContext } from "../../GameState";
import WaitingForPlayers from "../../game/WaitingForPlayers.tsx";
import { GameEvent } from "../../../game/events";

export default function Vote() {
  const [voted, setVoted] = useState(false);
  const gameContext = useContext(GameContext);

  const headerMessage = useMemo(() => {
    if (voted) {
      return "Thank you for voting!";
    } else {
      return "Vote for the Spy or Confused Players:";
    }
  }, [voted]);

  const isSpectator = useMemo(() => {
    const me = gameContext.players.find((p) => p.id === gameContext.playerID);
    return me ? me.alive === false : false;
  }, [gameContext.players, gameContext.playerID]);

  const filteredPlayers = useMemo(() => {
    return gameContext.players.filter(
      (player) => player.id !== gameContext.playerID && player.alive,
    );
  }, [gameContext.players]);

  /** Stable order so vote buttons do not reorder mid-round (breaks e2e and confuses players). */
  const voteTargets = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => a.id.localeCompare(b.id));
  }, [filteredPlayers]);

  const handleVote = useCallback(
    (playerID: string) => {
      setVoted(true);
      gameContext.sendSocketMessage({
        playerID: gameContext.playerID,
        roomID: gameContext.roomCode,
        type: GameEvent.VOTE,
        text: playerID,
      });
    },
    [setVoted],
  );

  if (isSpectator) {
    return (
      <div className="phase-layout">
        <h3 id="spectator-banner" className="text-center">
          You've been eliminated — watch the rest of the round.
        </h3>
        <WaitingForPlayers />
      </div>
    );
  }

  return (
    <div className="phase-layout">
      <h3 id="vote-header" className="text-center">
        {headerMessage}
      </h3>
      {!voted &&
        voteTargets.map((player) => (
          <button
            key={player.id}
            type="button"
            className="fw-button cta-button"
            data-testid={`vote-for-${player.id}`}
            onClick={() => handleVote(player.id)}
          >
            Vote for {player.displayName}
          </button>
        ))}
      {voted && (
        <div>
          <WaitingForPlayers />
        </div>
      )}
    </div>
  );
}
