import { GameEvent } from "./events";
import { Player } from "./player";
import { GameState } from "./game";
import { Phase } from "../components/phases/phases";

export interface InboundMessage {
  messageID?: string;
  type?: GameEvent;
  roomID?: string;
  phase?: Phase;
  playerID?: string;
  text?: string;
  player?: Player;
  gameState?: Partial<GameState>;
  timestamp?: string;
}

export interface OutboundMessage {
  type?: GameEvent;
  roomID?: string;
  phase?: Phase;
  playerID?: string;
  text?: string;
  player?: Player;
}

export function sortMessages(m: InboundMessage[]): InboundMessage[] {
  return m.sort((a, b) => {
    const aTime = new Date(a.timestamp || "").getTime();
    const bTime = new Date(b.timestamp || "").getTime();
    return aTime - bTime;
  });
}
