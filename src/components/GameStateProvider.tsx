import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { GameContext } from "./GameState";
import Config from "../config.ts";
import { Phase } from "./phases/phases.ts";
import { GameEvent } from "../game/events.ts";
import { OutboundMessage, InboundMessage } from "../game/message.ts";
import { Player } from "../game/player.ts";
import { GameContextType } from "./GameState";

interface ContextProviderProps {
  children: React.ReactNode;
}

export default function GameStateProvider(p: ContextProviderProps) {
  const [messages, setMessages] = useState<InboundMessage[]>([]);
  const [playerName, setPlayerName] = useState("");
  const [currentPhase, setCurrentPhase] = useState<Phase>(
    Phase.WAITING_FOR_PLAYERS,
  );
  const [roomCode, setRoomCode] = useState("");
  const [playerID, setPlayerID] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [playerWord, setPlayerWord] = useState("");

  function handleShowSnackbar(msg: InboundMessage) {
    setErrorMessage(msg.text as string);
    setShowSnackbar(true);
    setTimeout(() => setShowSnackbar(false), 5000);
  }
  const handleSetName = (name: string) => {
    setPlayerName(name);
    const updateMessage = {
      type: GameEvent.UPDATE_PLAYER_NAME,
      playerID: playerID,
      playerName: name,
    };

    sendSocketMessage(updateMessage);
  };

  const handleIncomingMessage = (msg: InboundMessage) => {
    console.info("incoming message", msg);
    setMessages((prevMessages) => [...prevMessages, msg]);
    switch (msg.type) {
      case GameEvent.ERROR:
        handleShowSnackbar(msg);
        break;
      case GameEvent.PLAYER_CONNECTED:
        setPlayerID(msg?.playerID as string);
        break;
      case GameEvent.ROOM_CREATED:
      case GameEvent.ROOM_JOINED:
        setRoomCode(msg?.roomID as string);
        break;
      case GameEvent.PLAYER_JOINED:
      case GameEvent.UPDATE_PLAYER_NAME:
        setPlayers(msg?.gameState?.players as Player[]);
        break;
      case GameEvent.PHASE_UPDATED:
        setCurrentPhase(msg?.phase as Phase);
        break;
      case GameEvent.ROLE_REVEAL:
        const word = (msg?.text as string) || "";
        setPlayerWord(word);
        break;
      default:
        console.error("Unknown message type:", msg.type);
    }
  };

  const sendSocketMessage = (m: OutboundMessage) => {
    socketRef?.current?.send(JSON.stringify(m));
  };

  const value = useMemo<GameContextType>(
    () => ({
      phase: currentPhase,
      playerName,
      updatePlayerName: handleSetName,
      roomCode,
      sendSocketMessage,
      playerID,
      players,
      currentWord: playerWord,
      clearRoomCode: () => {
        setRoomCode("");
        setPlayerName("");
        setPlayers([]);
      },
    }),
    [currentPhase, playerName, roomCode, playerID, players, playerWord],
  );

  useEffect(() => {
    const socket = new WebSocket(`ws://${Config.backendUrl}/ws`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.info("WebSocket connected");
      const m = {
        type: GameEvent.PLAYER_CONNECTED,
      };
      sendSocketMessage(m);
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as unknown as InboundMessage;
      handleIncomingMessage(msg);
    };

    socket.onclose = () => {
      console.info("WebSocket disconnected");
    };

    return () => {
      try {
        socket.close();
      } catch (e) {
        console.error("Error closing WebSocket:", e);
      }
    };
  }, []);

  return (
    <GameContext.Provider value={value}>
      <div>
        {p.children}
        {showSnackbar && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
            {errorMessage}
          </div>
        )}
      </div>
    </GameContext.Provider>
  );
}
