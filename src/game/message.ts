import { GameEvent } from "./events";
import { Phase } from "../components/phases/phases";
import { Player } from "./player";

interface GameState {
  players: Player[];
}

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
