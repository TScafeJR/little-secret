import { GameContextType } from "./components/GameState";

export {};

declare global {
  interface Window {
    secret?: {
      state: GameContextType;
    };
  }
}
