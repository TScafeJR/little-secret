import { createContext } from "react";

interface LobbyContextType {
  leaveGame: () => void;
}

export const LobbyContext = createContext<LobbyContextType>({
  leaveGame: () => {},
});
