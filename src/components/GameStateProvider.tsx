import React, { useEffect, useRef, useState } from "react";
import { GameContextType, GameContext } from "./GameState";
import Config from "../config.ts";
import { Phase } from "./phases/phases.ts";
import { GameEvent } from "../game/events.ts";
import { Message } from "../game/message.ts";

interface ContextProviderProps {
  children: React.ReactNode;
}

export default function GameStateProvider(p: ContextProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [role, setRole] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [currentPhase, setCurrentPhase] = useState<Phase>(
    Phase.WAITING_FOR_PLAYERS,
  );
  const [roomCode, setRoomCode] = useState("");
  const [playerID, setPlayerID] = useState("1234");
  const socketRef = useRef<WebSocket | null>(null);

  const handleSetName = (name: string) => {
    setPlayerName(name); // Update state
    const updateMessage = {
      type: "updatePlayerName",
      playerID: playerID,
      playerName: name,
    };

    // Send message via WebSocket
    socketRef.current?.send(JSON.stringify(updateMessage));
  };

  const handleIncomingMessage = (msg: Message) => {
    console.debug(msg);
    setMessages((prevMessages) => [...prevMessages, msg]);
    switch (msg.type) {
      case GameEvent.PLAYER_CONNECTED:
        setRoomCode(msg?.roomID as string);
        break;
      case GameEvent.ROOM_JOINED:
        break;
      default:
        console.error("Unknown message type:", msg.type);
    }
  };

  const sendSocketMessage = (m: Message) => {
    socketRef.current?.send(JSON.stringify(m));
  };

  const value: GameContextType = {
    phase: currentPhase,
    playerName: playerName,
    updatePlayerName: handleSetName,
    roomCode: roomCode,
    sendSocketMessage: sendSocketMessage,
    playerID: playerID,
  };

  useEffect(() => {
    const socket = new WebSocket(`ws://${Config.backendUrl}/ws`);
    socketRef.current = socket;
    socket.onopen = () => {
      console.info("WebSocket connected");
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as unknown as Message;
      handleIncomingMessage(msg);
    };

    socket.onclose = () => {
      console.info("WebSocket disconnected");
    };

    return () => socket.close();
  }, []);

  return (
    <GameContext.Provider value={value}>{p.children}</GameContext.Provider>
  );
}
