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
          <div className="phase-layout">
            <p className="phase-note">
              Gather your crew and pick your role for this round.
            </p>
            <button
              className="fw-button cta-button"
              id="host-btn"
              onClick={() => setRole(Role.HOST)}
            >
              New Game
            </button>
            <button
              className="fw-button reg-button"
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
      <div className="phase-layout my-2">{body}</div>
    </LobbyContext.Provider>
  );
}
