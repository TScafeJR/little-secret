# Little Secret — implementation TODO

Tracking the remaining work to finish the game per
`public/Little_Secret_US_FLYER.pdf`. Scope decisions: Secret Weapons deferred,
ties resolved by random pick server-side.

## Wave 0 — scaffolding

- [x] Create this file
- [x] E2E helper fix (`src/tests/helpers.ts::submitOneClueFromActivePlayer` was
      gated on a disabled submit button; fill the clue input first)

## Wave 1 — backend correctness

- [x] Increment `Round` on `RevealRolePhase → SubmitCluePhase` transition
      (`internal/game/service/events.go::handleRoleConfirmed`), broadcast
      `RoundUpdatedEvent`
- [x] Reject clue/vote submissions from dead players; emit `ErrorEvent` to
      sender
- [x] Random tiebreak in `VoteRound.ResolveVotes`; preserve full tied list as
      `TiedPlayerIDs` for UI
- [x] Add `Result.Reason` and `Game.DetermineWinners()` covering
      `allImpostersOut`, `impostersSurvived`, `spyGuessedWord`,
      `twoPlayersLeft`; replace ad-hoc `res.WinningRoles` assembly
- [x] Spy-guess-correct → `GameOverPhase` regardless of `IsOver`;
      spy-guess-wrong → kill spy, fall through to `IsOver`
- [x] Clue validation: reject clue equal to sender's `SecretWord` (normalized);
      reject duplicate clue within current round; `ErrorEvent` on reject

## Wave 2 — frontend wiring

- [x] Mirror `Result.Reason` on the TS `GameResult` (`src/game/game.ts`)
- [x] Expand `GameOver.tsx` to render a human summary per reason and list alive
      players by role; keep `#game-over-summary`
- [x] Spectator view in `Clue.tsx` and `Vote.tsx` when the local player is
      `alive === false`
- [x] Tie display in `RevealRole.tsx` when `voteRound.tiedPlayerIDs` is
      non-empty
- [x] Confirm `ROUND_UPDATE` / `PHASE_UPDATED` handlers in
      `GameStateProvider.tsx` rely on server-merged `gameState.round` (no
      client-side round math)

## Wave 3 — tests

### Backend (Go)

- [x] Extend `internal/game/game_test.go`: table-driven `IsOver` for 4–8 player
      role configs; `DetermineWinners` per reason; `IncrementRound`,
      `KillPlayer`
- [x] Extend `internal/game/vote_round_test.go`: random-tiebreak returns a
      single voted-out ID drawn from the tied set; `TiedPlayerIDs` preserved
- [x] New `internal/game/service/events_test.go` covering:
  - Happy-path phase progression including a second SubmitClue round (regression
    for round-increment)
  - Dead player's clue rejected
  - Duplicate clue rejected
  - Clue equal to secret word rejected
  - Spy-guess correct → `GameOver` + `spyGuessedWord`; spy-guess wrong →
    `SubmitCluePhase` (no premature `Result`)

### Frontend unit (Vitest)

- [x] `src/game/message.test.ts` — `sortMessages` ordering + stability
- [x] Extend `src/game/player.test.ts` — `getCurrentCluePlayer` skipping dead
      `lastSubmittedPlayerID`; `getFirstAlivePlayer` with nobody alive
- [x] `src/game/clue.test.ts` — `getClueRoundForRound`, `clueCountInRound`,
      `getClueTexts`
- [x] `src/game/vote.test.ts` — `tallyVotesByTarget`, `getMaxVoteCount`
- [x] `src/components/GameStateProvider.test.tsx` — mocked `WebSocket`
      (`vitest` + `jsdom` + `@testing-library/react`)

### Storybook interaction

- [x] Interaction story for each phase (Lobby, Info, Clue, Vote, RevealRole,
      GameOver) asserting key ids render and representative outbound messages
      fire

### Playwright E2E

- [x] `advanceThroughRevealRole(pages)` helper
- [x] `runToGameOver(browser, numPlayers)` driver (Good-win path)
- [x] Test: 4-player reach GameOver phase
- [x] Spy-guess E2E (`src/tests/user-journey.spec.ts`): wrong guess →
      `submitClue`; correct guess → `gameOver` + summary (correct test uses
      `retries: 5` because the first candidate word may be the decoy)

## Wave 4 — cleanup

- [x] `make test` green (`go test ./internal/...` passes)
- [x] `yarn test:unit` green
- [ ] `make go-lint` — run with `staticcheck` installed via
      `go install honnef.co/go/tools/cmd/staticcheck@latest` (same `go` as
      `go version`). Current `staticcheck` still reports pre-existing issues in
      `internal/secret` (SA1019 deprecations) and `internal/storage/sqldb`
      (U1000 unused type), not in the game parity work
- [x] `yarn lint` — fixed unused `_` in default context handlers and
      `no-case-declarations` in `GameStateProvider` `ROLE_REVEAL` case
- [x] `yarn test:storybook` (requires `yarn playwright:install` for Chromium)
- [ ] `yarn test:e2e:journey` — not run in this pass (E2E requires backend+Vite
      up)
- [ ] Update `CLAUDE.md` only if round semantics / events / phases changed in a
      user-visible way

## Crash recovery + event log

- [x] Migration `supabase/migrations/20260422000001_ls_game_events.sql` —
      append-only `ls_game_events` table (room_id, seq, event_type, payload
      jsonb, created_at); unique (room_id, seq)
- [x] `EventStore` interface (`internal/game/service/eventstore.go`) with
      in-memory + Postgres implementations
- [x] `GameService` appends inbound message on every mutation AND writes a
      `_snapshot` row with full `*game.Game` JSON after each successful handler
- [x] `GameService.Recover(ctx)` loads the latest snapshot per room on boot;
      `NewServer` calls it before serving
- [x] `REJOIN` / `REJOINED` / `REJOIN_FAILED` events (4-place: Go const, service
      handler, TS enum, `GameStateProvider` inbound)
- [x] Client persists `{roomCode, playerID}` to `localStorage`; on WS open sends
      `REJOIN` if a session exists; on `REJOIN_FAILED` clears storage and
      restarts as a fresh `PLAYER_CONNECTED`
- [x] Go tests: event store round-trip, snapshot recovery restores
      phase/players, rejoin swaps conn / fails cleanly on unknown room or player
- [ ] **Apply the new migration before running the backend against a live DB**:
      `yarn supabase:reset` (or `supabase migration up`). Until then,
      `PGEventStore.Append` errors are logged and ignored — games still work
      in-memory but aren't persisted.
- [ ] **Restart the backend** (`make go-srv` / `docker compose watch`) to pick
      up the REJOIN handler, then re-run `yarn test:e2e:journey` for the
      `rejoin after reload` test

## Stretch / deferred

- [ ] Secret Weapons (optional 6+ rule) — new card layer, swap-before-vote
      effects, per-weapon UI
- [ ] Full tie-defense flow per printed rules: ~10s defense window + revote
      excluding tied players, double-elim only on second tie (replaces the
      random tiebreak)

## How to run tests locally

- Unit (Vitest, `src/game/**/*.test.ts` + `GameStateProvider.test.tsx`,
  `jsdom`): `yarn test:unit`
- Storybook (Vitest browser + Storybook addon): one-time
  `yarn playwright:install`, then `yarn test:storybook`
- E2E (Playwright): start backend + Vite (`make go-srv`, `yarn dev`), then
  `yarn test` or `make yarn-test`
- Go: `make go-test` (or `make test` for Go + frontend together)
