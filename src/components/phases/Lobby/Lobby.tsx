import { useState, useMemo } from "react";
import Host from "./Host.tsx";
import Player from "./Player.tsx";

interface LobbyProps {
  playerName: string;
  onSetName: (name: string) => void;
}

enum Role {
  HOST = "host",
  PLAYER = "player",
}

export default function Lobby(p: LobbyProps) {
  const [role, setRole] = useState<Role | null>(null);

  const body = useMemo(() => {
    switch (role) {
      case Role.HOST:
        return <Host {...p} handleLeaveGame={() => setRole(null)} />;
      case Role.PLAYER:
        return <Player {...p} handleLeaveGame={() => setRole(null)} />;
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <button className="fw-button" onClick={() => setRole(Role.HOST)}>
              New Game
            </button>
            <button className="fw-button" onClick={() => setRole(Role.PLAYER)}>
              Join Game
            </button>
          </div>
        );
    }
  }, [role]);

  return <div className="my-4">{body}</div>;
}
