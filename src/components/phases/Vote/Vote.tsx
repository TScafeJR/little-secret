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

  const filteredPlayers = useMemo(() => {
    return gameContext.players.filter(
      (player) => player.id !== gameContext.playerID && player.alive,
    );
  }, [gameContext.players]);

  const randomizedOrder = useMemo(() => {
    return [...filteredPlayers].sort(() => Math.random() - 0.5);
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

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <h3 className="text-center">{headerMessage}</h3>
      {!voted &&
        randomizedOrder.map((player) => (
          <button
            className="fw-button cta-button"
            id="confirm-word-btn"
            onClick={() => handleVote(player.id)}
          >
            Vote for {player.displayName}
          </button>
        ))}
      {voted && (
        <div>
          <p>Thank you for voting!</p>
          <WaitingForPlayers />
        </div>
      )}
    </div>
  );
}
