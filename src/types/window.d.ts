import { GameContextType } from "./components/GameState";
import { InboundMessage } from "./game/message";

export {};

declare global {
  interface Window {
    secret?: {
      state: GameContextType;
      messages: InboundMessage[];
    };
  }
}
