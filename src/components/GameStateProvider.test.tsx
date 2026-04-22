import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, waitFor, screen, cleanup } from "@testing-library/react";
import { useContext } from "react";
import GameStateProvider from "./GameStateProvider";
import { GameContext } from "./GameState";
import { GameEvent } from "../game/events";
import { Phase } from "./phases/phases";

vi.mock("../config", () => ({
  default: { backendUrl: "127.0.0.1:8080" },
}));

class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onclose: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  static last: MockWebSocket | null = null;
  constructor(url: string) {
    void url;
    MockWebSocket.last = this;
    queueMicrotask(() => this.onopen?.());
  }
}

function Probe() {
  const { playerID, round, phase } = useContext(GameContext);
  return (
    <div>
      <span data-testid="player-id">{playerID}</span>
      <span data-testid="round">{String(round)}</span>
      <span data-testid="phase">{phase}</span>
    </div>
  );
}

describe("GameStateProvider", () => {
  beforeEach(() => {
    MockWebSocket.last = null;
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sends playerConnected on open and updates playerID from the server", async () => {
    render(
      <GameStateProvider>
        <Probe />
      </GameStateProvider>,
    );

    const ws = (await waitFor(() => {
      expect(MockWebSocket.last).toBeTruthy();
      return MockWebSocket.last;
    })) as MockWebSocket;
    await waitFor(() => {
      expect(ws.send).toHaveBeenCalled();
    });
    const first = JSON.parse(ws.send.mock.calls[0]![0] as string) as {
      type?: string;
    };
    expect(first.type).toBe(GameEvent.PLAYER_CONNECTED);

    ws.onmessage?.({
      data: JSON.stringify({
        type: GameEvent.PLAYER_CONNECTED,
        playerID: "p-test-1",
      }),
    });

    await waitFor(() => {
      expect(screen.getByTestId("player-id").textContent).toBe("p-test-1");
    });
  });

  it("merges round from roundUpdated without client-side round math", async () => {
    render(
      <GameStateProvider>
        <Probe />
      </GameStateProvider>,
    );

    const socket = (await waitFor(() => {
      expect(MockWebSocket.last).toBeTruthy();
      return MockWebSocket.last;
    })) as MockWebSocket;
    await waitFor(() => expect(socket.send).toHaveBeenCalled());

    socket.onmessage?.({
      data: JSON.stringify({
        type: GameEvent.PLAYER_CONNECTED,
        playerID: "b",
      }),
    });
    await waitFor(() =>
      expect(screen.getByTestId("round").textContent).toBe("0"),
    );

    socket.onmessage?.({
      data: JSON.stringify({
        type: GameEvent.ROUND_UPDATE,
        gameState: { round: 4, clues: {}, votes: {} },
      }),
    });
    await waitFor(() =>
      expect(screen.getByTestId("round").textContent).toBe("4"),
    );
  });

  it("applies phaseUpdated and merged game state", async () => {
    render(
      <GameStateProvider>
        <Probe />
      </GameStateProvider>,
    );

    const socket = (await waitFor(() => {
      expect(MockWebSocket.last).toBeTruthy();
      return MockWebSocket.last;
    })) as MockWebSocket;
    await waitFor(() => expect(socket.send).toHaveBeenCalled());

    socket.onmessage?.({
      data: JSON.stringify({
        type: GameEvent.PLAYER_CONNECTED,
        playerID: "c",
      }),
    });
    await waitFor(() =>
      expect(screen.getByTestId("phase").textContent).toBe(
        Phase.WAITING_FOR_PLAYERS,
      ),
    );

    socket.onmessage?.({
      data: JSON.stringify({
        type: GameEvent.PHASE_UPDATED,
        phase: Phase.SUBMIT_CLUE,
        gameState: { round: 1, clues: {}, votes: {} },
      }),
    });
    await waitFor(() =>
      expect(screen.getByTestId("phase").textContent).toBe(Phase.SUBMIT_CLUE),
    );
  });
});
