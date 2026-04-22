import { useContext, useMemo } from "react";
import { GameContext } from "../../GameState";
import type { GameResultReason } from "../../../game/game";
import { GameEvent } from "../../../game/events";

const reasonText = (
  reason: GameResultReason | undefined,
  winners: string[],
): string => {
  const roleLabel = (r: string): string => {
    switch (r) {
      case "goodKitten":
        return "Good Kittens";
      case "confusedKitten":
        return "Confused Kittens";
      case "spyKitten":
        return "Spy Pup";
      default:
        return r;
    }
  };
  const side = winners.map(roleLabel).join(" & ") || "Nobody";
  switch (reason) {
    case "allImpostersOut":
      return `${side} win — all impostors were eliminated.`;
    case "spyGuessedWord":
      return `Spy Pup wins by guessing the password.`;
    case "impostersSurvived":
      return `${side} win — the impostors stayed hidden.`;
    case "twoPlayersLeft":
      return `${side} win — only two players remain.`;
    default:
      return `${side} win.`;
  }
};

export default function GameOver() {
  const gameContext = useContext(GameContext);

  const summary = useMemo(() => {
    const winners = gameContext.gameResult?.winningRoles ?? [];
    const reason = gameContext.gameResult?.reason;
    if (!winners.length && !reason) return null;
    return reasonText(reason, winners);
  }, [gameContext.gameResult]);

  const leaveRoom = () => {
    const roomID = gameContext.roomCode;
    const playerID = gameContext.playerID;

    gameContext.clearRoomCode();
    gameContext.sendSocketMessage({
      type: GameEvent.REMOVE_PLAYER,
      playerID,
      roomID,
    });
  };

  return (
    <div className="phase-layout">
      <h2 className="text-center">Game Over</h2>
      {summary ? (
        <p id="game-over-summary" className="text-center">
          {summary}
        </p>
      ) : (
        <p id="game-over-summary" className="text-center">
          Thanks for playing.
        </p>
      )}
      <ul
        id="game-over-roster"
        className="w-full max-w-sm flex flex-col gap-1 text-center"
      >
        {gameContext.players.map((p) => (
          <li
            key={p.id}
            data-testid={`game-over-player-${p.id}`}
            data-alive={p.alive ? "true" : "false"}
          >
            {p.displayName} {p.alive ? "" : "(eliminated)"}
          </li>
        ))}
      </ul>
      <button
        id="game-over-leave-btn"
        className="fw-button red-button"
        onClick={leaveRoom}
      >
        Leave Room
      </button>
    </div>
  );
}
