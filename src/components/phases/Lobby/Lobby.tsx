import { useState, useMemo, useContext } from "react";
import Host from "./Host.tsx";
import Player from "./Player.tsx";
import { GameContext } from "../../GameState";
import { LobbyContext } from "./LobbyContext.tsx";
import { GameEvent } from "../../../game/events.ts";

enum Role {
  HOST = "host",
  PLAYER = "player",
}

export default function Lobby() {
  const gameContext = useContext(GameContext);
  const [role, setRole] = useState<Role | null>(null);

  const body = useMemo(() => {
    switch (role) {
      case Role.HOST:
        return <Host />;
      case Role.PLAYER:
        return <Player />;
      default:
        return (
          <div className="flex flex-col items-center justify-items-end gap-4">
            <button
              className="fw-button"
              id="host-btn"
              onClick={() => setRole(Role.HOST)}
            >
              New Game
            </button>
            <button
              className="fw-button"
              id="player-btn"
              onClick={() => setRole(Role.PLAYER)}
            >
              Join Game
            </button>
          </div>
        );
    }
  }, [role, gameContext]);

  return (
    <LobbyContext.Provider
      value={{
        leaveGame: () => {
          setRole(null);
          gameContext.clearRoomCode();
          gameContext.sendSocketMessage({
            type: GameEvent.REMOVE_PLAYER,
            playerID: gameContext.playerID,
            roomID: gameContext.roomCode,
          });
        },
      }}
    >
      <div className="flex flex-col justify-end my-4">{body}</div>
    </LobbyContext.Provider>
  );
}
