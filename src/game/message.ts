import { GameEvent } from "./events";
import { Phase } from "../components/phases/phases";

export interface Message {
  type?: GameEvent;
  roomID?: string;
  phase?: Phase;
  playerID?: string;
  text?: string;
}
