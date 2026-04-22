import { useContext, useEffect, useState, useRef } from "react";
import { GameContext } from "../../GameState";
import { GameEvent } from "../../../game/events.ts";
import Players from "./Players.tsx";
import NameSubmission from "./NameSubmission.tsx";
import LeaveGameButton from "./LeaveGameButton.tsx";
import CodeDisplay from "./CodeDisplay.tsx";

export default function Host() {
  const [startEnabled, setStartEnabled] = useState(false);
  const [startGameText, setStartGameText] = useState(
    "Waiting for 3 players...",
  );
  const gameContext = useContext(GameContext);
  const createRoomSentRef = useRef(false);

  useEffect(() => {
    if (gameContext.roomCode !== "" || !gameContext.playerID) {
      return;
    }
    if (createRoomSentRef.current) {
      return;
    }
    createRoomSentRef.current = true;
    gameContext.sendSocketMessage({
      type: GameEvent.CREATE_ROOM,
      playerID: gameContext.playerID,
      roomID: gameContext.roomCode,
    });
  }, [
    gameContext.roomCode,
    gameContext.playerID,
    gameContext.sendSocketMessage,
  ]);

  useEffect(() => {
    if (gameContext.players.length >= 3) {
      setStartEnabled(true);
      setStartGameText("Start Game");
    } else {
      const count = 4 - gameContext.players.length;
      setStartEnabled(false);
      setStartGameText(`Waiting for ${count} players...`);
    }
  }, [gameContext.players.length]);

  const handleClick = () => {
    const m = {
      type: GameEvent.START_GAME,
      roomID: gameContext.roomCode,
    };
    gameContext.sendSocketMessage(m);
  };

  return (
    <div className="phase-layout">
      <CodeDisplay />
      <Players />
      <div className="w-full flex flex-col items-center justify-items-end gap-4">
        <NameSubmission />
        <button
          className="fw-button cta-button"
          id="start-game-btn"
          disabled={!startEnabled}
          onClick={handleClick}
        >
          {startGameText}
        </button>
        <LeaveGameButton />
      </div>
    </div>
  );
}
