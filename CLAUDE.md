# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project

Browser port of Exploding Kittens' "Little Secret" social-deduction card game. A
Go WebSocket server holds authoritative game state in memory; a React/Vite
client connects over a single `/ws` socket and re-renders phase components as
state broadcasts arrive. No REST surface exists — every client/server exchange
goes through the WebSocket.

## Commands

Dev loop (run these in separate shells):

- `yarn supabase:start` (or `make db-run`) — spins up the full local Supabase
  stack via the CLI. Postgres lands on `:54322`. The server dials `POSTGRES_URL`
  on boot and will fail to start without it, even though no game state is
  persisted yet.
- `docker compose watch` — builds and starts both services with hot reload:
  - **backend** (golang:1.25-alpine + air): source edits sync into the container
    and air rebuilds in-place. `go.mod` / `go.sum` / `Dockerfile` changes
    trigger a full rebuild. Reaches Postgres via `host.docker.internal:54322`,
    so `yarn supabase:start` must be up first. Named volumes (`go-mod-cache`,
    `go-build-cache`) keep rebuilds fast.
  - **frontend** (node:22-alpine + `yarn dev --host`): `src/`, `public/`,
    `index.html`, `vite.config.ts`, and the `tsconfig*.json` files are
    bind-mounted so Vite HMR picks up edits directly. `CHOKIDAR_USEPOLLING` is
    set because macOS file events don't cross Docker Desktop's bind-mount
    boundary reliably. `package.json` / `yarn.lock` / `Dockerfile.frontend`
    changes trigger a full rebuild. Vite serves on `:5173`, client still
    connects to `ws://localhost:8080/ws` on the host.

Alternative non-docker loops: `make go-srv` runs the backend directly on the
host (`.air.toml` wraps it for hot reload). `yarn dev` runs Vite directly.

Quality checks:

- Go: `make go-fmt`, `make go-lint` (staticcheck), `make go-test`
  (`go test -v ./internal/... ./...`). Single package:
  `go test ./internal/game/...`. Single test:
  `go test ./internal/game -run TestRoleAssignment`.
- Web: `yarn lint` (eslint), `yarn fmt` (prettier, `proseWrap: always`),
  `yarn build` (tsc + vite build).
- `make fmt` / `make lint` / `make test` run the Go and yarn variants together.

E2E tests (Playwright, `src/tests/user-journey.spec.ts`):

- `yarn test` — requires `yarn dev` AND `make go-srv` running. Tests hit
  `http://localhost:5173` and drive 4–8 browser contexts per test.
- `yarn test:ui` for the Playwright UI; `yarn test:report` to view the last run.
- Single test: `yarn playwright test -g "4 player game"`.
- These tests select by hard-coded ids (`#host-btn`, `#player-btn`,
  `#room-code`, `#room-code-input`, `#room-code-submit`, `#start-game-btn`,
  `#player-word`, `#confirm-word-btn`). Renaming/removing these ids breaks the
  suite — grep before editing lobby/info phase components.

## Architecture

### Server (`cmd/srv`, `cmd/cli`, `internal/`)

Two Go entrypoints:

- `cmd/srv/main.go` — production binary. Pulls `POSTGRES_URL` from GCP Secret
  Manager via `internal/secret`, requires `GOOGLE_CLOUD_PROJECT` env.
- `cmd/cli/main.go` — urfave/cli wrapper. `srv local` subcommand is what local
  dev runs; it reads flags/env directly and skips Secret Manager.

Both funnel into `internal/server.ServeWeb`, which builds a chi router with a
single route: `GET /ws → GameService.HandleWebSocket`
(`internal/server/routes/sockets.go`).

`GameService` (`internal/game/service/`) is the in-memory hub:

- `Rooms map[id.RoomHash]*Room`, each Room holds a `map[*websocket.Conn]bool`
  and a `*game.Game`. Guarded by `sync.Mutex`.
- `sockets.go` runs a read loop per connection; every inbound payload is parsed
  as a `Message` and routed through `RespondToMessage` in `events.go`, which
  switches on `Message.Type` (a `game.Event` string).
- Handlers mutate the `Game` directly and then call `broadcastToRoom` or
  `sendMessageToConnection`. Mutations that change public state should include
  `GameState: g.GetGameState()` in the outbound message so clients can
  rehydrate.
- Room IDs are short hashes derived from a UUID via `common.UUIDToShort`; the
  short form is what clients see and type in.

`internal/game/` holds the pure domain model (no websocket deps):

- `Game` tracks `Players`, `Phase`, `Round`, `Votes[round]`, `Clues[round]`,
  `SecretWord`/`DecoyWord`, and a `Result`.
- Roles (`role.go`) are assigned from `data/role-config.json` keyed by player
  count (4–8 supported). Good kittens get `SecretWord`, confused kittens get
  `DecoyWord`, spy kittens get nothing. Word pairs come from `data/words.json`.
  Both JSON files are `go:embed`-ed — editing them requires a rebuild.
- Phases flow WaitingForPlayers → Info → SubmitClue → Vote → RevealRole → (loops
  SubmitClue/Vote until `IsOver`) → GameOver. `IsOver` returns true once
  `alive(confused)+alive(spy) >= alive(good)`.
- `IsWordRevealingRound()` is "is this round 0" — round 0 reveals the voted-out
  player's word before looping; subsequent rounds skip straight to
  SubmitCluePhase.

### Client (`src/`)

- `GameStateProvider` (`src/components/GameStateProvider.tsx`) owns the single
  `WebSocket` ref and all derived state (phase, players, clues, votes, round,
  words). Every inbound event is funneled through one switch; every outbound
  event goes through `sendSocketMessage`. Phase components consume state via
  `GameContext` and send events via `sendSocketMessage` — they do not own
  sockets.
- `Game.tsx` is a pure `switch (phase)` that renders `Lobby` / `Info` / `Clue` /
  `Vote` / `RevealRole`. `GameOver` has no component yet.
- `src/game/events.ts` mirrors `internal/game/events.go`. The string values must
  match exactly — these are the wire protocol. Same applies to `phases.ts` vs
  `internal/game/events.go` `Phase` constants, and `message.ts` / `player.ts` /
  `clue.ts` / `vote.ts` which shadow the Go structs.
- In dev, `GameStateProvider` mirrors context and message history onto
  `window.secret` for manual inspection from the devtools console.

### Cross-cutting

- Adding a new client↔server event means editing **four** places: the Go
  `Event` const in `internal/game/events.go`, the handler switch in
  `internal/game/service/events.go`, the TS enum in `src/game/events.ts`, and
  the inbound handler in `GameStateProvider.tsx`. Forgetting any one of these
  surfaces as "unknown message type" logs on one side.
- Supabase is configured (`supabase/config.toml`, `yarn supabase:*` scripts) but
  game state is not yet persisted. Treat the DB connection as a placeholder — if
  a task touches persistence, flag that this wiring doesn't exist yet.
