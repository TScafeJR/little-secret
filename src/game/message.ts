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
  gameState?: GameState;
}

export interface OutboundMessage {
  type?: GameEvent;
  roomID?: string;
  phase?: Phase;
  playerID?: string;
  text?: string;
  player?: Player;
}
