import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { GameContext } from "./GameState";
import Config from "../config.ts";
import { Phase } from "./phases/phases.ts";
import { GameEvent } from "../game/events.ts";
import {
  OutboundMessage,
  InboundMessage,
  sortMessages,
} from "../game/message.ts";
import { Player, sortPlayers } from "../game/player.ts";
import { GameContextType } from "./GameState";
import { ClueRound } from "../game/clue.ts";
import { VoteRound } from "../game/vote.ts";
import { GameResult, GameState } from "../game/game.ts";

interface ContextProviderProps {
  children: React.ReactNode;
}

// Session keys persisted to localStorage so a refresh or server restart can
// rejoin the same room as the same player. Cleared on REJOIN_FAILED and by
// the Lobby "leave" path.
const SESSION_STORAGE_KEY = "little-secret:session";

type StoredSession = { roomCode: string; playerID: string };

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.roomCode || !parsed.playerID) return null;
    return { roomCode: parsed.roomCode, playerID: parsed.playerID };
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredSession) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable (private mode, quota) — rejoin just won't work */
  }
}

function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* no-op */
  }
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
  const [clues, setClues] = useState<Record<number, ClueRound>>({});
  const [round, setRound] = useState(0);
  const [votes, setVotes] = useState<Record<number, VoteRound>>({});
  const [roundWord, setRoundWord] = useState("");
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  const mergeGameState = React.useCallback(
    (gs: Partial<GameState> | undefined) => {
      if (!gs) return;
      if (gs.players) {
        setPlayers(sortPlayers(gs.players as Player[]));
      }
      if (gs.votes !== undefined) {
        setVotes(gs.votes as Record<number, VoteRound>);
      }
      if (gs.clues !== undefined) {
        setClues(gs.clues as Record<number, ClueRound>);
      }
      if (typeof gs.round === "number") {
        setRound(gs.round);
      }
      if (gs.result !== undefined) {
        setGameResult(gs.result ?? null);
      }
    },
    [],
  );

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
      text: name,
      roomID: roomCode,
    };

    sendSocketMessage(updateMessage);
  };

  const handleIncomingMessage = (msg: InboundMessage) => {
    console.info("incoming message", msg);
    setMessages((prevMessages) => sortMessages([...prevMessages, msg]));
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
      case GameEvent.REMOVE_PLAYER:
      case GameEvent.PROCESSED_VOTE:
        mergeGameState(msg.gameState);
        break;
      case GameEvent.PHASE_UPDATED:
        setCurrentPhase(msg?.phase as Phase);
        mergeGameState(msg.gameState);
        break;
      case GameEvent.ROLE_REVEAL: {
        const word = (msg?.text as string) || "";
        setPlayerWord(word);
        break;
      }
      case GameEvent.ROUND_UPDATE:
        mergeGameState(msg.gameState);
        break;
      case GameEvent.CLUE_SUBMITTED:
        mergeGameState(msg.gameState);
        break;
      case GameEvent.VOTES_UPDATED:
        setVotes(msg?.gameState?.votes as Record<number, VoteRound>);
        break;
      case GameEvent.WORD_SHARED:
        setRoundWord(msg?.text as string);
        break;
      case GameEvent.GAME_OVER:
        mergeGameState(msg.gameState);
        setCurrentPhase((msg.phase as Phase) ?? Phase.GAME_OVER);
        break;
      case GameEvent.REJOINED:
        setPlayerID(msg?.playerID as string);
        setRoomCode(msg?.roomID as string);
        if (msg?.phase) setCurrentPhase(msg.phase as Phase);
        mergeGameState(msg.gameState);
        break;
      case GameEvent.REJOIN_FAILED:
        clearStoredSession();
        setRoomCode("");
        setPlayers([]);
        setGameResult(null);
        // Server has rejected us — restart as a fresh connection so the user
        // lands back in the lobby with a new playerID.
        sendSocketMessage({ type: GameEvent.PLAYER_CONNECTED });
        break;
      default:
        console.error("Unknown message type:", msg.type);
    }
  };

  const sendSocketMessage = useCallback((m: OutboundMessage) => {
    try {
      socketRef.current?.send(JSON.stringify(m));
    } catch (e) {
      console.error("WebSocket send failed", e);
    }
  }, []);

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
        clearStoredSession();
        setCurrentPhase(Phase.WAITING_FOR_PLAYERS);
        setRoomCode("");
        setPlayerID("");
        setPlayerName("");
        setPlayers([]);
        setPlayerWord("");
        setClues({});
        setRound(0);
        setVotes({});
        setRoundWord("");
        setGameResult(null);
      },
      clues,
      round: round,
      votes,
      roundWord: roundWord,
      gameResult,
    }),
    [
      currentPhase,
      playerName,
      roomCode,
      playerID,
      players,
      playerWord,
      clues,
      round,
      votes,
      roundWord,
      gameResult,
      sendSocketMessage,
    ],
  );

  useEffect(() => {
    const socket = new WebSocket(`ws://${Config.backendUrl}/ws`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.info("WebSocket connected");
      // Send on this `socket` — do not use sendSocketMessage (+ socketRef) here;
      // in dev, effect cleanup/open ordering can point the ref at a different tab.
      const stored = loadStoredSession();
      if (stored) {
        socket.send(
          JSON.stringify({
            type: GameEvent.REJOIN,
            roomID: stored.roomCode,
            playerID: stored.playerID,
          } satisfies OutboundMessage),
        );
        return;
      }
      socket.send(
        JSON.stringify({
          type: GameEvent.PLAYER_CONNECTED,
        } satisfies OutboundMessage),
      );
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as unknown as InboundMessage;
      handleIncomingMessage(msg);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
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

  useEffect(() => {
    if (roomCode && playerID) {
      saveStoredSession({ roomCode, playerID });
    }
  }, [roomCode, playerID]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      if (!window.secret) {
        window.secret = {
          state: value,
          messages: messages,
        };
      } else {
        window.secret.state = value;
        window.secret.messages = messages;
      }
    }
  }, [value, messages]);

  const e2ePlayersJson = JSON.stringify(
    players.map((p) => ({ id: p.id, displayName: p.displayName })),
  );

  return (
    <GameContext.Provider value={value}>
      <div>
        <div
          data-testid="e2e-root"
          data-phase={currentPhase}
          data-player-id={playerID}
          className="pointer-events-none fixed left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0"
          aria-hidden
        />
        <pre id="e2e-players-json" className="sr-only" aria-hidden>
          {e2ePlayersJson}
        </pre>
        {p.children}
        {showSnackbar && (
          <div
            id="error-snackbar"
            className="fixed top-8 left-1/2 -translate-x-1/2 bg-red-700 text-white px-4 py-2 rounded shadow-lg flex flex-col items-center"
          >
            <span>{errorMessage}</span>
            <button
              className="text-sm underline trans-button"
              onClick={() => setShowSnackbar(false)}
            >
              dismiss
            </button>
          </div>
        )}
      </div>
    </GameContext.Provider>
  );
}
