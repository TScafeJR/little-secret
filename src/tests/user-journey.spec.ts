import { test, expect } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import { Phase } from "../components/phases/phases.ts";
import {
  advanceThroughRevealRole,
  appUrl,
  expectPhaseOnAll,
  expectRoomCodePopulated,
  getGoodPlayerId,
  getGoodPlayerIds,
  getSecretWord,
  getSpyPlayerId,
  getTwoGamePasswordsFromInfoPhase,
  gotoAppForPlayers,
  openPlayerContexts,
  playRoundsUntilGameOver,
  submitOneClueFromActivePlayer,
  voteAllToEliminate,
  waitForRoomCode,
  waitForSocketPlayerId,
} from "./helpers.ts";

async function safeCloseContexts(pages: Page[]): Promise<void> {
  await Promise.all(
    pages.map(async (p) => {
      try {
        await p.context().close();
      } catch {
        /* browser may already be torn down on timeout */
      }
    }),
  );
}

const updateWordCount = (
  wordCount: Record<string, number>,
  word: string,
): Record<string, number> => {
  if (wordCount[word]) {
    wordCount[word] += 1;
  } else {
    wordCount[word] = 1;
  }
  return wordCount;
};

/** So #player-word text buckets align across tabs (whitespace / unicode differences). */
function normalizeWordDisplay(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

const getPlayers = async (
  browser: Browser,
  numPlayers: number,
): Promise<Page[]> => {
  return openPlayerContexts(browser, numPlayers);
};

interface TestConfig {
  sortOrder: number[];
}

const testConfig: Record<string, TestConfig> = {
  "4": {
    sortOrder: [1, 3],
  },
  "5": {
    sortOrder: [1, 1, 3],
  },
  "6": {
    sortOrder: [1, 1, 4],
  },
  "7": {
    sortOrder: [1, 2, 4],
  },
  "8": {
    sortOrder: [1, 2, 5],
  },
};

const LARGE_LOBBY_MIN = 7;

const isLargeLobby = (n: number) => n >= LARGE_LOBBY_MIN;

/** Full round trip opens N tabs end-to-end; 6+ needs more slack than 4–5. */
function fullRoundTripTimeouts(numPlayers: number) {
  return {
    socket: numPlayers >= 7 ? 120_000 : numPlayers >= 6 ? 100_000 : 90_000,
    roomCode: numPlayers >= 7 ? 90_000 : numPlayers >= 6 ? 75_000 : 60_000,
    startGame: numPlayers >= 7 ? 45_000 : numPlayers >= 6 ? 35_000 : 20_000,
    playerWord: numPlayers >= 7 ? 45_000 : numPlayers >= 6 ? 40_000 : 30_000,
  };
}

const runLobbyInfoTest = async (browser: Browser, numPlayers: number) => {
  const players = await getPlayers(browser, numPlayers);
  const host = players[0];
  const socketTimeout = isLargeLobby(numPlayers) ? 120_000 : 90_000;
  try {
    await gotoAppForPlayers(players, appUrl, numPlayers);

    await Promise.all(
      players.map((p) => waitForSocketPlayerId(p, socketTimeout)),
    );

    await Promise.all(
      players.map(async (player, i) => {
        if (i === 0) {
          return player.click("#host-btn");
        } else {
          return player.click("#player-btn");
        }
      }),
    );

    const roomCode = await waitForRoomCode(
      host,
      isLargeLobby(numPlayers) ? 90_000 : 60_000,
    );

    await Promise.all(
      players.slice(1).map(async (player) => {
        await player.locator("#room-code-input").pressSequentially(roomCode);
        await player.click("#room-code-submit");
        await expectRoomCodePopulated(player);
      }),
    );

    await expect(host.locator("#start-game-btn")).toBeEnabled({
      timeout: isLargeLobby(numPlayers) ? 45_000 : 20_000,
    });
    await host.click("#start-game-btn");
    let wordCount: Record<string, number> = {};

    // Many clients: server + UI need longer; assert in parallel so each tab gets the full window
    // (sequential per-page checks stack delay and underestimate tail clients).
    const wordVisibleTimeout = isLargeLobby(numPlayers) ? 45_000 : 15_000;
    await Promise.all(
      players.map((player) =>
        expect(player.locator("#player-word")).toBeVisible({
          timeout: wordVisibleTimeout,
        }),
      ),
    );
    for (const player of players) {
      const playerWord = await player.locator("#player-word").textContent();
      wordCount = updateWordCount(
        wordCount,
        normalizeWordDisplay((playerWord ?? "").toString()),
      );
    }

    const order = testConfig[numPlayers.toString()].sortOrder;

    const keys = Object.keys(wordCount);
    const counts = Object.values(wordCount).sort((a, b) => a - b);
    const hasSpyWord = keys.some((k) => /you are a spy/i.test(k));
    // words.json can pair the same string as secret+decoy → only two distinct uis (spy + everyone else)
    if (hasSpyWord && keys.length === 2) {
      expect(counts).toEqual([1, numPlayers - 1]);
    } else {
      expect(keys).toHaveLength(order.length);
      expect(counts).toEqual(order);
    }

    const confirmTimeout = isLargeLobby(numPlayers) ? 15_000 : 5_000;
    await Promise.all(
      players.map(async (player) => {
        await player.waitForSelector("#confirm-word-btn", {
          timeout: confirmTimeout,
        });
        return player.click("#confirm-word-btn");
      }),
    );
  } finally {
    await safeCloseContexts(players);
  }
};

async function runFullRoundTrip(browser: Browser, numPlayers: number) {
  const pages = await openPlayerContexts(browser, numPlayers);
  const host = pages[0];
  const t = fullRoundTripTimeouts(numPlayers);
  try {
    await gotoAppForPlayers(pages, appUrl, numPlayers);
    await Promise.all(pages.map((p) => waitForSocketPlayerId(p, t.socket)));
    await Promise.all(
      pages.map((p, i) =>
        i === 0 ? p.click("#host-btn") : p.click("#player-btn"),
      ),
    );

    const roomCode = await waitForRoomCode(host, t.roomCode);

    await Promise.all(
      pages.slice(1).map(async (player) => {
        await player.locator("#room-code-input").pressSequentially(roomCode);
        await player.click("#room-code-submit");
        await expectRoomCodePopulated(player);
      }),
    );

    await expect(host.locator("#start-game-btn")).toBeEnabled({
      timeout: t.startGame,
    });
    await host.click("#start-game-btn");

    await expectPhaseOnAll(pages, Phase.INFO);

    await Promise.all(
      pages.map((p) =>
        expect(p.locator("#player-word")).toBeVisible({
          timeout: t.playerWord,
        }),
      ),
    );
    // Pick the elimination target before confirming words — role-revealing
    // data (`You are a spy!`, secret vs decoy word) is only readable in Info.
    // IsOver fires when `confused+spy >= good` OR when `confused==0 && spy==0`.
    // 5+p: eliminating the spy keeps both conditions false.
    // 4p: no spy, and eliminating the lone confused would make impostersOut
    //   true → game ends. So pick a Good Kitten (majority-word holder) instead.
    const targetId =
      numPlayers >= 5
        ? await getSpyPlayerId(pages)
        : await getGoodPlayerId(pages);

    const confirmTimeout =
      numPlayers >= 7 ? 15_000 : numPlayers >= 6 ? 12_000 : 8_000;
    await Promise.all(
      pages.map(async (p) => {
        await p.locator("#confirm-word-btn").click({ timeout: confirmTimeout });
      }),
    );

    await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE);

    for (let c = 0; c < numPlayers; c++) {
      await submitOneClueFromActivePlayer(pages, c);
    }

    await expectPhaseOnAll(pages, Phase.VOTE);

    await voteAllToEliminate(pages, targetId);

    await expectPhaseOnAll(pages, Phase.REVEAL_ROLE);

    await advanceThroughRevealRole(pages);

    await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE);
  } finally {
    await safeCloseContexts(pages);
  }
}

/** Five-player game: lobby → first clue round → all vote out the spy → RevealRole. */
async function playFivePlayerThroughFirstRevealVotingOutSpy(
  browser: Browser,
): Promise<{
  pages: import("@playwright/test").Page[];
  host: import("@playwright/test").Page;
  spyId: string;
  passwords: [string, string];
  secretWord: string;
}> {
  const numPlayers = 5;
  const t = fullRoundTripTimeouts(numPlayers);
  const pages = await openPlayerContexts(browser, numPlayers);
  const host = pages[0];
  await gotoAppForPlayers(pages, appUrl, numPlayers);
  await Promise.all(pages.map((p) => waitForSocketPlayerId(p, t.socket)));
  await Promise.all(
    pages.map((p, i) =>
      i === 0 ? p.click("#host-btn") : p.click("#player-btn"),
    ),
  );
  const roomCode = await waitForRoomCode(host, t.roomCode);
  await Promise.all(
    pages.slice(1).map(async (player) => {
      await player.locator("#room-code-input").pressSequentially(roomCode);
      await player.click("#room-code-submit");
      await expectRoomCodePopulated(player);
    }),
  );
  await expect(host.locator("#start-game-btn")).toBeEnabled({
    timeout: t.startGame,
  });
  await host.click("#start-game-btn");
  await expectPhaseOnAll(pages, Phase.INFO);
  await Promise.all(
    pages.map((p) =>
      expect(p.locator("#player-word")).toBeVisible({ timeout: t.playerWord }),
    ),
  );
  const passwords = await getTwoGamePasswordsFromInfoPhase(pages);
  const spyId = await getSpyPlayerId(pages);
  const secretWord = await getSecretWord(pages);
  await Promise.all(
    pages.map((p) => p.locator("#confirm-word-btn").click({ timeout: 8_000 })),
  );
  await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE);
  for (let c = 0; c < numPlayers; c++) {
    await submitOneClueFromActivePlayer(pages, c);
  }
  await expectPhaseOnAll(pages, Phase.VOTE);
  await voteAllToEliminate(pages, spyId);
  await expectPhaseOnAll(pages, Phase.REVEAL_ROLE, 60_000);
  return { pages, host, spyId, passwords, secretWord };
}

async function runToGameOver(browser: Browser, numPlayers: number) {
  const pages = await openPlayerContexts(browser, numPlayers);
  const host = pages[0];
  const t = fullRoundTripTimeouts(numPlayers);
  try {
    await gotoAppForPlayers(pages, appUrl, numPlayers);
    await Promise.all(pages.map((p) => waitForSocketPlayerId(p, t.socket)));
    await Promise.all(
      pages.map((p, i) =>
        i === 0 ? p.click("#host-btn") : p.click("#player-btn"),
      ),
    );

    const roomCode = await waitForRoomCode(host, t.roomCode);
    await Promise.all(
      pages.slice(1).map(async (player) => {
        await player.locator("#room-code-input").pressSequentially(roomCode);
        await player.click("#room-code-submit");
        await expectRoomCodePopulated(player);
      }),
    );

    await expect(host.locator("#start-game-btn")).toBeEnabled({
      timeout: t.startGame,
    });
    await host.click("#start-game-btn");

    await expectPhaseOnAll(pages, Phase.INFO);
    await Promise.all(
      pages.map((p) =>
        expect(p.locator("#player-word")).toBeVisible({
          timeout: t.playerWord,
        }),
      ),
    );
    await Promise.all(
      pages.map(async (p) => {
        await p.locator("#confirm-word-btn").click({ timeout: 8_000 });
      }),
    );
    await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE);

    await playRoundsUntilGameOver(pages, numPlayers);

    await expectPhaseOnAll(pages, Phase.GAME_OVER);
    await expect(host.locator("#game-over-summary")).toBeVisible({
      timeout: 5_000,
    });
    // Regression guard: players must be able to leave after GameOver and return
    // to the lobby role picker.
    await host.locator("#game-over-leave-btn").click({ timeout: 5_000 });
    await expect(host.locator('[data-testid="e2e-root"]')).toHaveAttribute(
      "data-phase",
      Phase.WAITING_FOR_PLAYERS,
      { timeout: 10_000 },
    );
    await expect(host.locator("#host-btn")).toBeVisible({ timeout: 10_000 });
    await expect(host.locator("#player-btn")).toBeVisible({ timeout: 10_000 });
  } finally {
    await safeCloseContexts(pages);
  }
}

test.describe.serial("Little Secret user journeys", () => {
  test.describe("main user journey path", () => {
    test("4 player game", async ({ browser }: { browser: Browser }) => {
      await runLobbyInfoTest(browser, 4);
    });
    test("5 player game", async ({ browser }: { browser: Browser }) => {
      await runLobbyInfoTest(browser, 5);
    });
    test("6 player game", async ({ browser }: { browser: Browser }) => {
      await runLobbyInfoTest(browser, 6);
    });
    test("7 player game", async ({ browser }: { browser: Browser }) => {
      await runLobbyInfoTest(browser, 7);
    });
    test("8 player game", async ({ browser }: { browser: Browser }) => {
      await runLobbyInfoTest(browser, 8);
    });
  });

  test.describe("multiplayer full round trip", () => {
    test("4 players: clues, vote, reveal, clues again", async ({ browser }) => {
      await runFullRoundTrip(browser, 4);
    });

    test("5 players: clues, vote, reveal, clues again", async ({ browser }) => {
      await runFullRoundTrip(browser, 5);
    });

    test("6 players: clues, vote, reveal, clues again", async ({ browser }) => {
      await runFullRoundTrip(browser, 6);
    });

    test("7 players: clues, vote, reveal, clues again", async ({ browser }) => {
      await runFullRoundTrip(browser, 7);
    });

    test("8 players: clues, vote, reveal, clues again", async ({ browser }) => {
      await runFullRoundTrip(browser, 8);
    });
  });

  test.describe("play to game over", () => {
    test("4 players: reach GameOver phase", async ({ browser }) => {
      await runToGameOver(browser, 4);
    });
  });

  test.describe("spy guess (5 players)", () => {
    test("wrong password continues to submit clue", async ({ browser }) => {
      const { pages, spyId } =
        await playFivePlayerThroughFirstRevealVotingOutSpy(browser);
      try {
        let spyPage: Page | undefined;
        for (const p of pages) {
          const id =
            (await p
              .locator('[data-testid="e2e-root"]')
              .getAttribute("data-player-id")) ?? "";
          if (id === spyId) {
            spyPage = p;
            break;
          }
        }
        if (!spyPage) {
          throw new Error("no page for spy");
        }
        await spyPage.locator("#guess-input").fill("___not-the-password___");
        await spyPage.locator("#spy-guess-submit").click();
        await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE, 30_000);
      } finally {
        await safeCloseContexts(pages);
      }
    });

    test("correct password: spy wins by guessing the password", async ({
      browser,
    }) => {
      const { pages, host, spyId, secretWord } =
        await playFivePlayerThroughFirstRevealVotingOutSpy(browser);
      try {
        let spyPage: Page | undefined;
        for (const p of pages) {
          const id =
            (await p
              .locator('[data-testid="e2e-root"]')
              .getAttribute("data-player-id")) ?? "";
          if (id === spyId) {
            spyPage = p;
            break;
          }
        }
        if (!spyPage) {
          throw new Error("no page for spy");
        }
        await spyPage.locator("#guess-input").fill(secretWord);
        await spyPage.locator("#spy-guess-submit").click();
        await expectPhaseOnAll(pages, Phase.GAME_OVER, 30_000);
        await expect(host.locator("#game-over-summary")).toContainText(
          /guessing the password/i,
        );
      } finally {
        await safeCloseContexts(pages);
      }
    });
  });

  test.describe("clue validation", () => {
    // The rulebook forbids a kitten from using their own password as a clue,
    // or from repeating another player's clue this round. Both rejections
    // surface as #error-snackbar and must not advance the phase.
    test("4 players: clue equal to own password is rejected", async ({
      browser,
    }) => {
      const numPlayers = 4;
      const pages = await openPlayerContexts(browser, numPlayers);
      const host = pages[0];
      try {
        await gotoAppForPlayers(pages, appUrl, numPlayers);
        await Promise.all(pages.map((p) => waitForSocketPlayerId(p, 30_000)));
        await Promise.all(
          pages.map((p, i) =>
            i === 0 ? p.click("#host-btn") : p.click("#player-btn"),
          ),
        );
        const roomCode = await waitForRoomCode(host, 30_000);
        await Promise.all(
          pages.slice(1).map(async (player) => {
            await player
              .locator("#room-code-input")
              .pressSequentially(roomCode);
            await player.click("#room-code-submit");
            await expectRoomCodePopulated(player);
          }),
        );
        await expect(host.locator("#start-game-btn")).toBeEnabled({
          timeout: 30_000,
        });
        await host.click("#start-game-btn");
        await expectPhaseOnAll(pages, Phase.INFO);
        await Promise.all(
          pages.map((p) =>
            expect(p.locator("#player-word")).toBeVisible({ timeout: 15_000 }),
          ),
        );

        // Find the first kitten whose word is the majority (Good) and grab
        // their password; 4p has no spy so every player has a real word.
        const passwords: { id: string; word: string }[] = [];
        for (const p of pages) {
          const raw = (await p.locator("#player-word").textContent()) ?? "";
          const word = raw.replace(/\s+/g, " ").trim();
          const id =
            (await p
              .locator('[data-testid="e2e-root"]')
              .getAttribute("data-player-id")) ?? "";
          passwords.push({ id, word });
        }

        await Promise.all(
          pages.map((p) =>
            p.locator("#confirm-word-btn").click({ timeout: 8_000 }),
          ),
        );
        await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE);

        // Whoever's turn it is, submit *their* password as the clue. Server
        // must reject with an error and keep the phase on SubmitClue.
        let activeIdx = -1;
        for (let i = 0; i < pages.length; i++) {
          if (
            await pages[i]
              .locator("#clue-input")
              .isVisible()
              .catch(() => false)
          ) {
            activeIdx = i;
            break;
          }
        }
        expect(
          activeIdx,
          "expected an active clue submitter",
        ).toBeGreaterThanOrEqual(0);
        const activePage = pages[activeIdx];
        const activeId = await activePage
          .locator('[data-testid="e2e-root"]')
          .getAttribute("data-player-id");
        const myPassword = passwords.find((p) => p.id === activeId)?.word ?? "";
        expect(myPassword, "active player must have a password").not.toBe("");

        await activePage.locator("#clue-input").fill(myPassword);
        await activePage.locator("#player-clue-submit").click();

        await expect(activePage.locator("#error-snackbar")).toContainText(
          /password/i,
          { timeout: 10_000 },
        );
        // Still the same player's turn; phase unchanged.
        await expect(
          activePage.locator('[data-testid="e2e-root"]'),
        ).toHaveAttribute("data-phase", Phase.SUBMIT_CLUE);
        await expect(activePage.locator("#clue-input")).toBeVisible();
      } finally {
        await safeCloseContexts(pages);
      }
    });

    test("4 players: duplicate clue is rejected", async ({ browser }) => {
      const numPlayers = 4;
      const pages = await openPlayerContexts(browser, numPlayers);
      const host = pages[0];
      try {
        await gotoAppForPlayers(pages, appUrl, numPlayers);
        await Promise.all(pages.map((p) => waitForSocketPlayerId(p, 30_000)));
        await Promise.all(
          pages.map((p, i) =>
            i === 0 ? p.click("#host-btn") : p.click("#player-btn"),
          ),
        );
        const roomCode = await waitForRoomCode(host, 30_000);
        await Promise.all(
          pages.slice(1).map(async (player) => {
            await player
              .locator("#room-code-input")
              .pressSequentially(roomCode);
            await player.click("#room-code-submit");
            await expectRoomCodePopulated(player);
          }),
        );
        await expect(host.locator("#start-game-btn")).toBeEnabled({
          timeout: 30_000,
        });
        await host.click("#start-game-btn");
        await expectPhaseOnAll(pages, Phase.INFO);
        await Promise.all(
          pages.map((p) =>
            expect(p.locator("#player-word")).toBeVisible({ timeout: 15_000 }),
          ),
        );
        await Promise.all(
          pages.map((p) =>
            p.locator("#confirm-word-btn").click({ timeout: 8_000 }),
          ),
        );
        await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE);

        // First active player submits a benign clue, next active player
        // submits the exact same clue and is rejected.
        const firstClue = "unique-clue-abc";
        let active = -1;
        for (let i = 0; i < pages.length; i++) {
          if (
            await pages[i]
              .locator("#clue-input")
              .isVisible()
              .catch(() => false)
          ) {
            active = i;
            break;
          }
        }
        await pages[active].locator("#clue-input").fill(firstClue);
        await pages[active].locator("#player-clue-submit").click();

        // Wait for the next player's input to appear.
        let nextActive = -1;
        for (let attempt = 0; attempt < 40 && nextActive === -1; attempt++) {
          for (let i = 0; i < pages.length; i++) {
            if (i === active) continue;
            if (
              await pages[i]
                .locator("#clue-input")
                .isVisible()
                .catch(() => false)
            ) {
              nextActive = i;
              break;
            }
          }
          if (nextActive === -1) await new Promise((r) => setTimeout(r, 100));
        }
        expect(
          nextActive,
          "expected next active player",
        ).toBeGreaterThanOrEqual(0);

        await pages[nextActive].locator("#clue-input").fill(firstClue);
        await pages[nextActive].locator("#player-clue-submit").click();

        await expect(
          pages[nextActive].locator("#error-snackbar"),
        ).toContainText(/already used/i, { timeout: 10_000 });
        await expect(
          pages[nextActive].locator('[data-testid="e2e-root"]'),
        ).toHaveAttribute("data-phase", Phase.SUBMIT_CLUE);
        await expect(pages[nextActive].locator("#clue-input")).toBeVisible();
      } finally {
        await safeCloseContexts(pages);
      }
    });
  });

  test.describe("imposters win by survival", () => {
    // Rulebook: Confused Kittens win by staying hidden; Spy wins if undetected.
    // Drive a 5-player game where only Good Kittens get voted out so the
    // game ends with Result.Reason = "impostersSurvived" or "twoPlayersLeft".
    test("5 players: voting out good kittens ends the game with imposters surviving", async ({
      browser,
    }) => {
      const numPlayers = 5;
      const pages = await openPlayerContexts(browser, numPlayers);
      const host = pages[0];
      try {
        await gotoAppForPlayers(pages, appUrl, numPlayers);
        await Promise.all(pages.map((p) => waitForSocketPlayerId(p, 30_000)));
        await Promise.all(
          pages.map((p, i) =>
            i === 0 ? p.click("#host-btn") : p.click("#player-btn"),
          ),
        );
        const roomCode = await waitForRoomCode(host, 30_000);
        await Promise.all(
          pages.slice(1).map(async (player) => {
            await player
              .locator("#room-code-input")
              .pressSequentially(roomCode);
            await player.click("#room-code-submit");
            await expectRoomCodePopulated(player);
          }),
        );
        await expect(host.locator("#start-game-btn")).toBeEnabled({
          timeout: 30_000,
        });
        await host.click("#start-game-btn");
        await expectPhaseOnAll(pages, Phase.INFO);
        await Promise.all(
          pages.map((p) =>
            expect(p.locator("#player-word")).toBeVisible({ timeout: 15_000 }),
          ),
        );

        // Capture all Good player IDs before Info ends — after confirm the
        // word is no longer visible.
        const goodIds = await getGoodPlayerIds(pages);
        expect(goodIds.length).toBe(3);

        await Promise.all(
          pages.map((p) =>
            p.locator("#confirm-word-btn").click({ timeout: 8_000 }),
          ),
        );
        await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE);

        // 5p role config is 3 Good / 1 Confused / 1 Spy. Voting out a single
        // Good Kitten drops alive(Good) to 2, which equals alive(Confused)+
        // alive(Spy) — IsOver() trips immediately and phase jumps from Vote
        // through RevealRole (for the word share) into GameOver with
        // reason=impostersSurvived or twoPlayersLeft.
        for (let c = 0; c < numPlayers; c++) {
          const phase = await host
            .locator('[data-testid="e2e-root"]')
            .getAttribute("data-phase");
          if (phase !== Phase.SUBMIT_CLUE) break;
          await submitOneClueFromActivePlayer(pages, c);
        }
        await expectPhaseOnAll(pages, Phase.VOTE, 30_000);
        await voteAllToEliminate(pages, goodIds[0]);

        // Phase may hop through RevealRole or jump directly to GameOver
        // depending on whether DetermineWinners short-circuits the reveal.
        // Advance past RevealRole if it shows up.
        await host.waitForFunction(
          () => {
            const p = document
              .querySelector('[data-testid="e2e-root"]')
              ?.getAttribute("data-phase");
            return p === "revealRole" || p === "gameOver";
          },
          { timeout: 30_000 },
        );
        const mid = await host
          .locator('[data-testid="e2e-root"]')
          .getAttribute("data-phase");
        if (mid === "revealRole") {
          await advanceThroughRevealRole(pages);
        }

        await expectPhaseOnAll(pages, Phase.GAME_OVER, 30_000);
        // Rulebook win path: imposters stayed hidden. The summary should not
        // credit Good Kittens with a clean sweep.
        await expect(host.locator("#game-over-summary")).not.toContainText(
          /all .* eliminated/i,
        );
      } finally {
        await safeCloseContexts(pages);
      }
    });
  });

  test.describe("rejoin after reload", () => {
    test("4 players: reloading a tab mid-round rejoins into the same phase", async ({
      browser,
    }) => {
      const numPlayers = 4;
      const pages = await openPlayerContexts(browser, numPlayers);
      const host = pages[0];
      try {
        await gotoAppForPlayers(pages, appUrl, numPlayers);
        await Promise.all(pages.map((p) => waitForSocketPlayerId(p, 30_000)));
        await Promise.all(
          pages.map((p, i) =>
            i === 0 ? p.click("#host-btn") : p.click("#player-btn"),
          ),
        );
        const roomCode = await waitForRoomCode(host, 30_000);
        await Promise.all(
          pages.slice(1).map(async (player) => {
            await player
              .locator("#room-code-input")
              .pressSequentially(roomCode);
            await player.click("#room-code-submit");
            await expectRoomCodePopulated(player);
          }),
        );
        await expect(host.locator("#start-game-btn")).toBeEnabled({
          timeout: 30_000,
        });
        await host.click("#start-game-btn");
        await expectPhaseOnAll(pages, Phase.INFO);
        await Promise.all(
          pages.map((p) =>
            expect(p.locator("#player-word")).toBeVisible({ timeout: 15_000 }),
          ),
        );
        await Promise.all(
          pages.map((p) =>
            p.locator("#confirm-word-btn").click({ timeout: 8_000 }),
          ),
        );
        await expectPhaseOnAll(pages, Phase.SUBMIT_CLUE);

        // Capture the rejoiner's identity before reload, then reload the tab.
        const rejoiner = pages[2];
        const playerIDBefore = await rejoiner
          .locator('[data-testid="e2e-root"]')
          .getAttribute("data-player-id");
        await rejoiner.reload();

        // After reload the client should use localStorage to REJOIN and land
        // back in submitClue with the same playerID.
        await expect(
          rejoiner.locator('[data-testid="e2e-root"]'),
        ).toHaveAttribute("data-phase", Phase.SUBMIT_CLUE, { timeout: 30_000 });
        await expect(
          rejoiner.locator('[data-testid="e2e-root"]'),
        ).toHaveAttribute("data-player-id", playerIDBefore ?? "", {
          timeout: 5_000,
        });
      } finally {
        await safeCloseContexts(pages);
      }
    });
  });
});
