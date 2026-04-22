import type { Meta, StoryObj } from "@storybook/react-vite";
import Game from "../components/Game";
import { GameStateMock, baseContext } from "./GameStateMock";
import { getPlayers } from "./helpers/players";
import { Phase } from "../components/phases/phases";
import type { GameContextType } from "../components/GameState";
import { generateClues } from "./helpers/clues";

type ViewMode = "desktop" | "mobile";

const players = getPlayers(5);
const twoPlayers = players.slice(0, 2).map((p) => ({ ...p }));

const makeState = (
  overrides: Partial<GameContextType>,
  mode: ViewMode,
): GameContextType => ({
  ...baseContext,
  roomCode: "OVRVW",
  playerID: players[0].id,
  players,
  ...overrides,
  sendSocketMessage: () => {},
  updatePlayerName: () => {},
  clearRoomCode: () => {},
  phase: overrides.phase ?? baseContext.phase,
  playerName: mode === "mobile" ? "Mobile Viewer" : "Desktop Viewer",
});

const primaryScenarios: Array<{
  title: string;
  desktop: GameContextType;
  mobile: GameContextType;
}> = [
  {
    title: "Lobby",
    desktop: makeState({ phase: Phase.WAITING_FOR_PLAYERS }, "desktop"),
    mobile: makeState({ phase: Phase.WAITING_FOR_PLAYERS }, "mobile"),
  },
  {
    title: "Info",
    desktop: makeState(
      {
        phase: Phase.INFO,
        currentWord: "lighthouse",
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.INFO,
        currentWord: "lighthouse",
      },
      "mobile",
    ),
  },
  {
    title: "Clue Turn",
    desktop: makeState(
      {
        phase: Phase.SUBMIT_CLUE,
        round: 1,
        clues: {},
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.SUBMIT_CLUE,
        round: 1,
        clues: {},
      },
      "mobile",
    ),
  },
  {
    title: "Clue Spectator",
    desktop: makeState(
      {
        phase: Phase.SUBMIT_CLUE,
        round: 1,
        playerID: players[2].id,
        players: players.map((p, i) => ({ ...p, alive: i !== 2 })),
        clues: {
          1: generateClues(players.slice(0, 3)),
        },
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.SUBMIT_CLUE,
        round: 1,
        playerID: players[2].id,
        players: players.map((p, i) => ({ ...p, alive: i !== 2 })),
        clues: {
          1: generateClues(players.slice(0, 3)),
        },
      },
      "mobile",
    ),
  },
  {
    title: "Vote",
    desktop: makeState(
      {
        phase: Phase.VOTE,
        round: 1,
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.VOTE,
        round: 1,
      },
      "mobile",
    ),
  },
  {
    title: "Reveal Role (tie note)",
    desktop: makeState(
      {
        phase: Phase.REVEAL_ROLE,
        round: 1,
        roundWord: "lighthouse",
        votes: {
          1: {
            votes: [],
            voteMap: {},
            votedOutPlayerIDs: [players[1].id],
            tiedPlayerIDs: [players[1].id, players[2].id],
          },
        },
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.REVEAL_ROLE,
        round: 1,
        roundWord: "lighthouse",
        votes: {
          1: {
            votes: [],
            voteMap: {},
            votedOutPlayerIDs: [players[1].id],
            tiedPlayerIDs: [players[1].id, players[2].id],
          },
        },
      },
      "mobile",
    ),
  },
  {
    title: "Game Over",
    desktop: makeState(
      {
        phase: Phase.GAME_OVER,
        gameResult: {
          reason: "allImpostersOut",
          winningRoles: ["goodKitten"],
        },
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.GAME_OVER,
        gameResult: {
          reason: "allImpostersOut",
          winningRoles: ["goodKitten"],
        },
      },
      "mobile",
    ),
  },
];

const edgeScenarios: Array<{
  title: string;
  desktop: GameContextType;
  mobile: GameContextType;
}> = [
  {
    title: "Vote Spectator (eliminated player)",
    desktop: makeState(
      {
        phase: Phase.VOTE,
        round: 2,
        playerID: players[0].id,
        players: players.map((p, i) => ({ ...p, alive: i !== 0 })),
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.VOTE,
        round: 2,
        playerID: players[0].id,
        players: players.map((p, i) => ({ ...p, alive: i !== 0 })),
      },
      "mobile",
    ),
  },
  {
    title: "Vote Already Confirmed",
    desktop: makeState(
      {
        phase: Phase.VOTE,
        round: 2,
        playerID: players[0].id,
        players: players.map((p, i) => ({
          ...p,
          alive: true,
          confirmedVote: i === 0,
        })),
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.VOTE,
        round: 2,
        playerID: players[0].id,
        players: players.map((p, i) => ({
          ...p,
          alive: true,
          confirmedVote: i === 0,
        })),
      },
      "mobile",
    ),
  },
  {
    title: "Reveal Role (spy guess flow)",
    desktop: makeState(
      {
        phase: Phase.REVEAL_ROLE,
        round: 2,
        currentWord: "",
        roundWord: "hidden",
        votes: {
          2: {
            votes: [],
            voteMap: {},
            votedOutPlayerIDs: [players[0].id],
          },
        },
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.REVEAL_ROLE,
        round: 2,
        currentWord: "",
        roundWord: "hidden",
        votes: {
          2: {
            votes: [],
            voteMap: {},
            votedOutPlayerIDs: [players[0].id],
          },
        },
      },
      "mobile",
    ),
  },
  {
    title: "Game Over (spy guessed word)",
    desktop: makeState(
      {
        phase: Phase.GAME_OVER,
        gameResult: {
          reason: "spyGuessedWord",
          winningRoles: ["spyKitten"],
        },
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.GAME_OVER,
        gameResult: {
          reason: "spyGuessedWord",
          winningRoles: ["spyKitten"],
        },
      },
      "mobile",
    ),
  },
  {
    title: "Game Over (imposters survived)",
    desktop: makeState(
      {
        phase: Phase.GAME_OVER,
        players: players.map((p, i) => ({ ...p, alive: i !== 0 })),
        gameResult: {
          reason: "impostersSurvived",
          winningRoles: ["confusedKitten", "spyKitten"],
        },
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.GAME_OVER,
        players: players.map((p, i) => ({ ...p, alive: i !== 0 })),
        gameResult: {
          reason: "impostersSurvived",
          winningRoles: ["confusedKitten", "spyKitten"],
        },
      },
      "mobile",
    ),
  },
  {
    title: "Game Over (two players left)",
    desktop: makeState(
      {
        phase: Phase.GAME_OVER,
        playerID: twoPlayers[0].id,
        players: twoPlayers,
        gameResult: {
          reason: "twoPlayersLeft",
          winningRoles: ["confusedKitten"],
        },
      },
      "desktop",
    ),
    mobile: makeState(
      {
        phase: Phase.GAME_OVER,
        playerID: twoPlayers[0].id,
        players: twoPlayers,
        gameResult: {
          reason: "twoPlayersLeft",
          winningRoles: ["confusedKitten"],
        },
      },
      "mobile",
    ),
  },
];

function Frame(props: {
  title: string;
  width: number;
  state: GameContextType;
}) {
  return (
    <div
      style={{
        width: props.width,
        minWidth: props.width,
        display: "flex",
        flexDirection: "column",
        gap: "0.45rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.76rem",
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#6c5642",
        }}
      >
        {props.title}
      </p>
      <div className="game-stage" style={{ margin: 0 }}>
        <GameStateMock state={props.state}>
          <Game />
        </GameStateMock>
      </div>
    </div>
  );
}

function OverviewBoard(props: {
  scenarios: Array<{
    title: string;
    desktop: GameContextType;
    mobile: GameContextType;
  }>;
}) {
  return (
    <div style={{ display: "grid", gap: "1.1rem", width: "100%" }}>
      {props.scenarios.map((scenario) => (
        <section
          key={scenario.title}
          style={{
            border: "1px solid rgba(98, 71, 43, 0.25)",
            borderRadius: "0.9rem",
            padding: "0.8rem",
            background: "rgba(255, 251, 241, 0.7)",
          }}
        >
          <h3
            style={{
              margin: "0 0 0.75rem",
              fontSize: "1rem",
              color: "#3e3023",
              textAlign: "left",
            }}
          >
            {scenario.title}
          </h3>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              overflowX: "auto",
              paddingBottom: "0.25rem",
            }}
          >
            <Frame title="Desktop" width={780} state={scenario.desktop} />
            <Frame title="Mobile" width={375} state={scenario.mobile} />
          </div>
        </section>
      ))}
    </div>
  );
}

const meta = {
  title: "Composed/Game Flow Overview",
  component: Game,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Game>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DesktopAndMobile: Story = {
  render: () => <OverviewBoard scenarios={primaryScenarios} />,
};

export const EdgeCases: Story = {
  render: () => <OverviewBoard scenarios={edgeScenarios} />,
};
