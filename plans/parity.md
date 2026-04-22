# Finish Little Secret + Comprehensive Tests

## Context

The repo implements the lobby, Info phase, clue submission, voting, and a
partially-wired reveal/game-over flow for a browser port of Exploding Kittens'
Little Secret. The printed rules (`public/Little_Secret_US_FLYER.pdf`,
extracted) describe the full loop: clue → debate → vote → reveal (possibly spy
guess) → repeat until all Confused + Spy are out (Good win), only Confused/Spy
remain (Confused/Spy win), or the Spy guesses the password on elimination (Spy
win).

Three motivations for this work:

1. **Functional gaps** block a playable end-to-end game. The server doesn't
   increment `Round` after `RevealRole → SubmitClue`, so round 2+ silently drops
   clues (`internal/game/service/events.go:320` `handleRoleConfirmed` never
   calls `g.IncrementRound()`; `handleClueSubmitted` at line 284 short-circuits
   on `cr.HasSubmitted`). Dead players aren't rejected from clue/vote handlers.
   `GameOver` doesn't distinguish Good-win vs Confused-win vs Spy-win-by-guess
   vs Spy-win-by-survival. Ties currently eliminate everyone tied rather than
   resolving to a single elimination.
2. **Test coverage is thin.** Backend has only `game_test.go`,
   `vote_round_test.go`, `role_test.go`; service handlers (the real state
   machine) are untested. Frontend has `src/game/player.test.ts` plus a broken
   Playwright run. Storybook tests exist but aren't wired to phase components.
3. **The E2E suite is currently blocked** on a helper bug (fixed pre-plan in
   `src/tests/helpers.ts:137` — `submitOneClueFromActivePlayer` was checking
   `isEnabled` on a button that's disabled until the input has content).
   Extending the suite past round 1 will immediately hit the round-increment
   bug.

Scope decisions confirmed with user:

- **Secret Weapons** (optional 6+ rule) — **deferred**; tracked as a stretch
  section in `TODO.md`.
- **Tie-breaking** — **random pick** from tied candidates server-side. Simpler
  than the printed 10s-defense-and-revote flow; no extra phase needed.

## Outcome

- A playable end-to-end game for 4–8 players, reaching `GameOver` with the
  correct winning side recorded.
- `TODO.md` at repo root tracking remaining work, checked off as items land.
- Backend unit tests covering `internal/game/*` domain logic and
  `internal/game/service` handlers.
- Frontend unit tests covering `src/game/*` helpers and message handling, plus
  Storybook interaction tests for phase components.
- Playwright E2E extended to cover a full round-trip to `GameOver` for at least
  4/5/7 players and the spy-guess branches.

## Approach

Work in four waves. Each wave ends green (`make test` + `yarn test`) before the
next starts. `TODO.md` is the running checklist and is created in Wave 0.

### Wave 0 — Scaffolding

- Create `TODO.md` at repo root. Structure mirrors waves below with checkboxes.
  Include a "Stretch / deferred" section for Secret Weapons and full
  tie-defense.
- Confirm the already-applied helper fix in `src/tests/helpers.ts:137` is
  retained.

### Wave 1 — Backend correctness (domain + service)

Files: `internal/game/game.go`, `internal/game/vote.go`,
`internal/game/service/events.go`, `internal/game/service/speciallogic.go`,
`internal/game/result.go`.

1. **Increment round on RevealRole → SubmitClue.** In `handleRoleConfirmed`
   (`internal/game/service/events.go:320`), before the non-GameOver
   `UpdatePhase(SubmitCluePhase)`, call `g.IncrementRound()` and broadcast
   `RoundUpdatedEvent` so clients clear the previous clue round.
2. **Reject dead-player actions.** In `handleClueSubmitted` and `handleVote`,
   early-return if `g.GetPlayer(m.PlayerID)` is not alive. Emit an `ErrorEvent`
   to the sender so misbehaving clients get a signal.
3. **Tie resolution.** Change `VoteRound.ResolveVotes`
   (`internal/game/vote.go:66`) — when `getVotedOutMembers()` returns >1, pick
   one at random via `internal/common`'s shuffle helper and store just that one
   in `VotedOutPlayerIDs`. Keep the full tied list on a new
   `TiedPlayerIDs []id.PlayerID` field for UI display.
4. **Win-condition resolution.** Extend `internal/game/result.go` `Result` with
   `Reason string` (one of `"allImpostersOut"`, `"impostersSurvived"`,
   `"spyGuessedWord"`, `"twoPlayersLeft"`). Add
   `Game.DetermineWinners() *Result`:
   - If called after a correct spy guess → `[SpyKitten]`, reason
     `spyGuessedWord`.
   - Else if all `Confused`+`Spy` alive == 0 → `[GoodKitten]`, reason
     `allImpostersOut`.
   - Else if alive good == 0 OR `NumberOfAlivePlayers() <= 2` with any imposter
     alive → `[ConfusedKitten, SpyKitten]` filtered to roles still alive, reason
     `impostersSurvived` or `twoPlayersLeft`. Replace the `res.WinningRoles`
     assembly in `handleRoleConfirmed` with this helper.
5. **GameOver transition on spy-guess.** Currently a correct spy guess is only
   recorded in `res.WinningRoles` if `g.IsOver()` also happens to be true.
   Explicitly: if the voted-out player was the spy AND guessed correctly →
   `GameOverPhase`. If incorrectly → kill them, then run `IsOver` /
   `DetermineWinners` as normal.
6. **Clue validation.** In `handleClueSubmitted`, reject clues that (a) match
   the player's own `SecretWord` (case-insensitive, trimmed), (b) duplicate any
   existing clue in `g.Clues[g.Round]`. Reuse `normalizeWord` from
   `internal/game/service/speciallogic.go`. Emit `ErrorEvent` on reject.

### Wave 2 — Frontend wiring

Files: `src/components/phases/GameOver/GameOver.tsx`,
`src/components/phases/Vote/Vote.tsx`,
`src/components/phases/RevealRole/RevealRole.tsx`,
`src/components/GameStateProvider.tsx`, `src/game/game.ts`,
`src/game/message.ts`, `src/game/events.ts`.

1. **GameResult shape parity.** Extend `GameResult` in `src/game/game.ts` with
   `reason?: string` matching the Go `Result.Reason`.
2. **GameOver UI.** Expand `GameOver.tsx` to render a human summary per `reason`
   (e.g. "Good Kittens win — all impostors eliminated", "Spy Pup wins by
   guessing the password") and list alive players by role at game end. Keep
   `#game-over-summary` id stable for E2E.
3. **Dead-player UX.** In `Clue.tsx` and `Vote.tsx`, when
   `gameContext.players.find(p => p.id === playerID)?.alive === false`, render a
   spectator view ("You've been eliminated — watch the rest of the round")
   instead of the input.
4. **Tie display.** When `voteRound.tiedPlayerIDs` is non-empty,
   `RevealRole.tsx` shows "Tie between X, Y — server picked Z".
5. **Round reset.** Ensure `ROUND_UPDATE` / `PHASE_UPDATED` handlers in
   `GameStateProvider.tsx` rely on server-sent `gameState.round` (already merged
   via `mergeGameState`) — no client-side round math.

### Wave 3 — Tests

**Backend (Go).** New files:

- `internal/game/game_test.go` (extend): table-driven tests for `IsOver` across
  4/5/6/7/8-player role configs with various alive combinations;
  `DetermineWinners` for each `reason`; `IncrementRound`, `KillPlayer`,
  `AllAlivePlayersSubmittedClue`.
- `internal/game/vote_round_test.go` (extend): random-tiebreak produces a single
  voted-out ID drawn from the tied set; `TiedPlayerIDs` preserved.
- `internal/game/service/events_test.go` (new): in-memory fakes for
  `*websocket.Conn` via `net.Pipe`-backed gorilla server test helper. Cover:
  - Happy-path phase progression: Start → Info confirm → SubmitClue → Vote →
    RevealRole → SubmitClue (with `Round` incremented) → … → GameOver (Good
    win).
  - Spy-guess-correct ends game with `[SpyKitten]` reason `spyGuessedWord`.
  - Spy-guess-wrong kills spy and continues.
  - Dead player's clue/vote is rejected.
  - Duplicate clue rejected.
  - Clue equal to secret word rejected.

**Frontend unit (Vitest, `vitest.unit.config.ts`).** New files:

- `src/game/message.test.ts`: `sortMessages` stability + ordering.
- `src/game/vote.test.ts`: tally helpers if added during Wave 2.
- `src/game/clue.test.ts`: round helpers.
- `src/game/player.test.ts` (extend): `getCurrentCluePlayer` when
  `lastSubmittedPlayerID` refers to a dead player; `getFirstAlivePlayer` with
  nobody alive.
- `src/components/GameStateProvider.test.tsx`: render with a mocked `WebSocket`,
  push each inbound `GameEvent` type, assert context updates (phase, round,
  players, gameResult).

**Storybook interaction tests** (existing `vitest.storybook.workspace.ts`). One
story per phase component with a play function that asserts the key id is
present and a representative action fires the expected outbound message.

**Playwright E2E** (`src/tests/user-journey.spec.ts` + `src/tests/helpers.ts`).
New helpers and tests:

- `voteToEliminate(pages, targetId)` already exists; add
  `advanceThroughRevealRole(pages)` that clicks `#reveal-continue-btn` on
  whichever page shows it.
- `runToGameOver(browser, numPlayers, { loseAs })` that drives rounds until
  `GameOver`, with knobs for Good-win / Spy-guess-correct / Spy-guess-wrong
  paths.
- Tests: 4-player Good-win run; 5-player Spy-guesses-correctly run; 5-player
  Spy-guesses-wrong → continue → Good-win run. Keep existing 6/7/8 lobby+info
  tests.

### Wave 4 — Cleanup

- Run `make fmt`, `make lint`, `make test`, `yarn test`. Fix anything they
  surface.
- Update `CLAUDE.md` Architecture section only if the round-semantics change or
  new events/phases land; do not re-describe unchanged pieces.
- Tick off all matching boxes in `TODO.md`; leave the Stretch section intact.

## Critical files

**Will change:**

- `internal/game/game.go`, `internal/game/vote.go`, `internal/game/result.go`
- `internal/game/service/events.go`, `internal/game/service/speciallogic.go`
- `src/game/game.ts`, `src/game/events.ts`, `src/game/message.ts`
- `src/components/GameStateProvider.tsx`, `src/components/Game.tsx` (only if new
  phase added — not planned)
- `src/components/phases/GameOver/GameOver.tsx`,
  `src/components/phases/Vote/Vote.tsx`,
  `src/components/phases/RevealRole/RevealRole.tsx`,
  `src/components/phases/Clue/Clue.tsx`
- `src/tests/user-journey.spec.ts`, `src/tests/helpers.ts`

**Will be created:**

- `TODO.md` at repo root
- `internal/game/service/events_test.go`
- `src/game/message.test.ts`, `src/game/clue.test.ts`, `src/game/vote.test.ts`
- `src/components/GameStateProvider.test.tsx`
- `.stories.tsx` siblings for phases that don't have them yet (check before
  creating)

## Reuse

- `normalizeWord` in `internal/game/service/speciallogic.go:9` — use it for the
  clue/password comparison in Wave 1 step 6.
- `common.Shuffle` in `internal/common` (already used in `Game.StartGame`) —
  reuse for tie random-pick.
- `common.Set[id.PlayerID]` — already used for vote and clue submission
  tracking; no new primitive needed.
- `sortPlayers` / `getCurrentCluePlayer` in `src/game/player.ts` — already
  correct for dead-player skipping; Wave 2 spectator view just keys off `alive`.
- `mergeGameState` in `src/components/GameStateProvider.tsx:46` — already merges
  `round`, `votes`, `clues`, `players`, `result`. Wave 2 relies on it; don't
  reinvent.
- The four-place event-registration pattern documented in `CLAUDE.md`
  ("Cross-cutting") — any new event (e.g. `RoundUpdatedEvent` is already
  present, but if a `tieDetected` event is added, it goes in all four spots).

## Verification

Backend:

```
make go-fmt && make go-lint && make go-test
```

Frontend unit + Storybook:

```
yarn lint
yarn test:unit
yarn test:storybook
```

E2E (requires `yarn supabase:start`, `make go-srv`, `yarn dev` in separate
shells):

```
yarn test:e2e:journey
```

Manual smoke:

1. `docker compose watch` + `yarn supabase:start`.
2. Open 4 tabs at `http://localhost:5173`, host+3 players, start game.
3. Confirm word → submit clues in rotation → vote out host → RevealRole →
   continue → round 2 clues actually register (regression guard for the
   round-increment bug) → play to completion → `GameOver` shows a reason string
   matching the path taken.
4. Repeat with 5 players and intentionally vote the spy out, then (a) have spy
   guess the correct word → Spy win, (b) restart, have spy guess wrong → game
   continues until Good win.
