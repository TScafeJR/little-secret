import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Override if the Vite container is published on a different host/port. */
// Match Playwright webServer and `vite` (127.0.0.1 avoids localhost → ::1 vs IPv4 mismatches)
export const appUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";

const LARGE_LOBBY_STAGGER_MIN = 7;

/** Navigates every page to the app; staggers large lobbies to reduce WS stampede. */
export async function gotoAppForPlayers(
  pages: import("@playwright/test").Page[],
  url: string,
  numPlayers: number,
): Promise<void> {
  const staggerMs = numPlayers >= LARGE_LOBBY_STAGGER_MIN ? 200 : 0;
  if (staggerMs === 0) {
    await Promise.all(pages.map((p) => p.goto(url)));
    return;
  }
  for (const p of pages) {
    await p.goto(url);
    await new Promise((r) => setTimeout(r, staggerMs));
  }
}

/** Wait until the app has received `playerConnected` (avoids racing Host before WS is ready). */
export async function waitForSocketPlayerId(
  page: Page,
  timeout = 90_000,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const id =
          (await page
            .locator('[data-testid="e2e-root"]')
            .getAttribute("data-player-id")) ?? "";
        return id.trim().length;
      },
      { timeout, intervals: [100, 200, 500] },
    )
    .toBeGreaterThan(0);
}

export async function expectRoomCodePopulated(
  page: Page,
  timeout = 30_000,
): Promise<void> {
  await page.waitForFunction(
    () => {
      const el = document.querySelector("#room-code");
      const t = (el?.textContent ?? "").replace(/\s+/g, "").trim();
      return t.length >= 2;
    },
    { timeout },
  );
}

/** Host must receive `playerConnected` before `createRoom`; wait for non-empty code. */
export async function waitForRoomCode(
  host: Page,
  waitTimeoutMs = 60_000,
): Promise<string> {
  try {
    await host.waitForFunction(
      () => {
        const el = document.querySelector("#room-code");
        const t = (el?.textContent ?? "").replace(/\s+/g, "").trim();
        return t.length >= 2;
      },
      { timeout: waitTimeoutMs },
    );
  } catch {
    const root = host.locator('[data-testid="e2e-root"]');
    const phase = await root.getAttribute("data-phase").catch(() => null);
    const playerID = await root
      .getAttribute("data-player-id")
      .catch(() => null);
    throw new Error(
      [
        "Timed out waiting for a room code after clicking Host.",
        `Debug: data-phase=${phase ?? "?"} data-player-id=${playerID ? "set" : "empty"}.`,
        "The WebSocket server must be running (default ws://localhost:8080/ws).",
        "From repo root: start Postgres per .env-local, then in separate shells run `make go-srv` and `yarn dev`, then `yarn test`.",
      ].join(" "),
    );
  }
  const raw = (await host.locator("#room-code").textContent()) ?? "";
  const code = raw.replace(/\s+/g, "").trim();
  if (!code) {
    throw new Error("room code was empty after wait");
  }
  return code;
}

type SecretPlayer = { id: string; displayName: string };

export async function openPlayerContexts(
  browser: import("@playwright/test").Browser,
  count: number,
): Promise<Page[]> {
  const pages: Page[] = [];
  for (let i = 0; i < count; i++) {
    const context = await browser.newContext();
    pages.push(await context.newPage());
  }
  return pages;
}

/**
 * Waits until the app reports the given phase via `data-testid="e2e-root"`
 * (works in dev and production builds; `window.secret` is dev-only).
 */
export async function waitForDevPhase(
  page: Page,
  phase: string,
  timeout = 120_000,
): Promise<void> {
  await expect(page.locator('[data-testid="e2e-root"]')).toHaveAttribute(
    "data-phase",
    phase,
    { timeout },
  );
}

export async function getSecretPlayers(page: Page): Promise<SecretPlayer[]> {
  const raw = (await page.locator("#e2e-players-json").textContent()) ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed) as SecretPlayer[];
  } catch {
    return [];
  }
}

export async function submitOneClueFromActivePlayer(
  pages: Page[],
  clueIndex: number,
  timeout = 90_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const p of pages) {
      // Only the active player renders the clue input; use its visibility as the
      // "is-turn" signal. Checking the submit button's enabled state doesn't work
      // here — it's gated on a non-empty clue value, so it's disabled until we type.
      const input = p.locator("#clue-input");
      const visible = await input.isVisible().catch(() => false);
      if (!visible) continue;
      try {
        // The clue UI can rerender between `isVisible` and `fill` in larger
        // lobbies; treat detaches/timeouts as a transient race and retry.
        await input.fill(`clue-${clueIndex}`, { timeout: 1_500 });
        await p.locator("#player-clue-submit").click({ timeout: 3_000 });
        return;
      } catch {
        continue;
      }
    }
    await delay(50);
  }
  const debugDetails = await Promise.all(
    pages.map(async (page, idx) => {
      const root = page.locator('[data-testid="e2e-root"]');
      const [phase, playerID] = await Promise.all([
        root.getAttribute("data-phase").catch(() => null),
        root.getAttribute("data-player-id").catch(() => null),
      ]);
      return `p${idx}: phase=${phase ?? "?"} playerID=${playerID ?? "?"}`;
    }),
  );
  throw new Error(
    `Timed out waiting for an active clue submitter (${debugDetails.join(", ")})`,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function expectPhaseOnAll(
  pages: Page[],
  phase: string,
  timeout = 120_000,
): Promise<void> {
  await Promise.all(pages.map((p) => waitForDevPhase(p, phase, timeout)));
}

/**
 * Clicks `#reveal-continue-btn` on whichever page currently has it visible.
 * In RevealRole the button is rendered on every non-spy non-voted-out player
 * plus the non-spy voted-out player, so we just click the first one available.
 */
export async function advanceThroughRevealRole(
  pages: Page[],
  timeout = 10_000,
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    for (const p of pages) {
      const btn = p.locator("#reveal-continue-btn");
      const visible = await btn.isVisible().catch(() => false);
      if (!visible) continue;
      await btn.click({ timeout: 2_000 });
      return;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Timed out waiting for #reveal-continue-btn");
}

/**
 * Runs clue → vote → reveal rounds until the game reports GAME_OVER on page 0.
 * Each round: alive pages submit one clue in rotation (one per page), then
 * everyone votes for the first alive non-self player (random-ish but stable
 * enough to converge on a win since we just keep eliminating).
 */
export async function playRoundsUntilGameOver(
  pages: Page[],
  numPlayers: number,
  maxRounds = numPlayers,
): Promise<void> {
  const host = pages[0];
  for (let r = 0; r < maxRounds; r++) {
    const phase = await host
      .locator('[data-testid="e2e-root"]')
      .getAttribute("data-phase");
    if (phase === "gameOver") return;

    // one clue per alive player
    for (let c = 0; c < numPlayers; c++) {
      const phaseNow = await host
        .locator('[data-testid="e2e-root"]')
        .getAttribute("data-phase");
      if (phaseNow !== "submitClue") break;
      await submitOneClueFromActivePlayer(pages, r * numPlayers + c);
    }

    // Wait for Vote phase
    await host
      .locator('[data-testid="e2e-root"]')
      .waitFor({ state: "attached", timeout: 5_000 });
    await host.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="e2e-root"]')
          ?.getAttribute("data-phase") === "vote",
      { timeout: 30_000 },
    );

    // pick first alive non-self as target (from roster JSON)
    const roster = await getSecretPlayers(host);
    const target = roster[0];
    if (!target) throw new Error("no players in roster");
    await voteAllToEliminate(pages, target.id);

    // Wait for RevealRole OR GameOver
    await host.waitForFunction(
      () => {
        const p = document
          .querySelector('[data-testid="e2e-root"]')
          ?.getAttribute("data-phase");
        return p === "revealRole" || p === "gameOver";
      },
      { timeout: 30_000 },
    );

    const post = await host
      .locator('[data-testid="e2e-root"]')
      .getAttribute("data-phase");
    if (post === "gameOver") return;

    await advanceThroughRevealRole(pages);
    await host.waitForFunction(
      () => {
        const p = document
          .querySelector('[data-testid="e2e-root"]')
          ?.getAttribute("data-phase");
        return p === "submitClue" || p === "gameOver";
      },
      { timeout: 15_000 },
    );
  }
}

/**
 * Everyone targets `targetId` for elimination except the target, who cannot
 * self-vote and instead casts one vote for someone else (so the tally still
 * eliminates `targetId` when all others vote for them).
 */
export async function voteAllToEliminate(
  pages: Page[],
  targetId: string,
): Promise<void> {
  for (const p of pages) {
    // Skip eliminated spectators — they have no vote buttons.
    const spectator = await p
      .locator("#spectator-banner")
      .isVisible()
      .catch(() => false);
    if (spectator) continue;

    const myId =
      (await p
        .locator('[data-testid="e2e-root"]')
        .getAttribute("data-player-id")) ?? "";
    const targetBtn = p.locator(`[data-testid="vote-for-${targetId}"]`);
    const targetVisible = await targetBtn.isVisible().catch(() => false);
    if (myId === targetId || !targetVisible) {
      await p
        .locator(
          `[data-testid^="vote-for-"]:not([data-testid="vote-for-${targetId}"])`,
        )
        .first()
        .click({ force: true });
    } else {
      await targetBtn.click({ force: true });
    }
    // The last voter's click advances everyone to RevealRole, which unmounts
    // Vote.tsx before the "Thank you for voting" header can be observed. Accept
    // either the local acknowledgement or the phase transition.
    await p.waitForFunction(
      () => {
        const root = document.querySelector('[data-testid="e2e-root"]');
        const phase = root?.getAttribute("data-phase");
        if (phase && phase !== "vote") return true;
        const header = document.querySelector("#vote-header");
        return header?.textContent?.includes("Thank you for voting") ?? false;
      },
      null,
      { timeout: 30_000 },
    );
  }
}

/**
 * In Info, the spy’s `#player-word` shows "You are a spy!"; others show the
 * two possible passwords. Returns the two unique word strings.
 * Polls briefly so ROLE_REVEAL can populate each tab before we read.
 */
export async function getTwoGamePasswordsFromInfoPhase(
  pages: Page[],
): Promise<[string, string]> {
  const deadline = Date.now() + 30_000;
  let last = "";
  const isHiddenPlaceholder = (t: string) =>
    /^[\s•\u2022\u00B7.]+$/u.test(t) || t === "••••••••";

  while (Date.now() < deadline) {
    const set = new Set<string>();
    for (const p of pages) {
      const raw = (await p.locator("#player-word").textContent()) ?? "";
      const t = raw.replace(/\s+/g, " ").trim();
      if (
        t.length > 0 &&
        !/you are a spy/i.test(t) &&
        !isHiddenPlaceholder(t)
      ) {
        set.add(t);
      }
    }
    if (set.size === 2) {
      const arr = Array.from(set);
      return [arr[0]!, arr[1]!];
    }
    last = `distinct=${set.size} values=${[...set].join(" | ")}`;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `expected 2 distinct non-spy word strings in #player-word: ${last}`,
  );
}

/**
 * Returns the id of a player holding the majority (secret) word — i.e. a
 * guaranteed Good Kitten. Useful when a test needs to eliminate a player
 * without triggering IsOver (which fires when `confused==0 && spy==0`, so
 * eliminating the lone confused in a 4p game would end the round).
 */
export async function getGoodPlayerId(pages: Page[]): Promise<string> {
  const entries: { id: string; word: string }[] = [];
  for (const p of pages) {
    const raw = (await p.locator("#player-word").textContent()) ?? "";
    const word = raw.replace(/\s+/g, " ").trim();
    if (!word || /you are a spy/i.test(word)) continue;
    const id =
      (await p
        .locator('[data-testid="e2e-root"]')
        .getAttribute("data-player-id")) ?? "";
    if (id) entries.push({ id, word });
  }
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.word, (counts.get(e.word) ?? 0) + 1);
  let majorityWord = "";
  let best = 0;
  for (const [w, n] of counts) {
    if (n > best) {
      best = n;
      majorityWord = w;
    }
  }
  const match = entries.find((e) => e.word === majorityWord);
  if (!match)
    throw new Error("could not identify a good player by majority word");
  return match.id;
}

/**
 * Returns the secret (Good Kitten) password by majority count across
 * non-spy `#player-word` values. In every supported player count the Good
 * Kittens outnumber the Confused Kitten, so the majority word is always the
 * secret. Call during Info phase before `#confirm-word-btn` is clicked.
 *
 * When the words.json pair uses the same string for secret and decoy, the
 * helper still returns that string — which is correctly the "secret" answer
 * anyway, so downstream tests keep working.
 */
export async function getSecretWord(pages: Page[]): Promise<string> {
  const counts = new Map<string, number>();
  for (const p of pages) {
    const raw = (await p.locator("#player-word").textContent()) ?? "";
    const word = raw.replace(/\s+/g, " ").trim();
    if (!word || /you are a spy/i.test(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  let majority = "";
  let best = 0;
  for (const [w, n] of counts) {
    if (n > best) {
      best = n;
      majority = w;
    }
  }
  if (!majority) {
    throw new Error(
      "could not determine secret word — no non-spy #player-word text",
    );
  }
  return majority;
}

/**
 * Returns every player id holding the majority (secret) word — i.e. all Good
 * Kittens. Used by tests that need to drive the game toward an imposters-win
 * ending by voting out good kittens one by one.
 */
export async function getGoodPlayerIds(pages: Page[]): Promise<string[]> {
  const entries: { id: string; word: string }[] = [];
  for (const p of pages) {
    const raw = (await p.locator("#player-word").textContent()) ?? "";
    const word = raw.replace(/\s+/g, " ").trim();
    if (!word || /you are a spy/i.test(word)) continue;
    const id =
      (await p
        .locator('[data-testid="e2e-root"]')
        .getAttribute("data-player-id")) ?? "";
    if (id) entries.push({ id, word });
  }
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.word, (counts.get(e.word) ?? 0) + 1);
  let majorityWord = "";
  let best = 0;
  for (const [w, n] of counts) {
    if (n > best) {
      best = n;
      majorityWord = w;
    }
  }
  return entries.filter((e) => e.word === majorityWord).map((e) => e.id);
}

/** Identifies the player id of the only spy in a 5+ player game. */
export async function getSpyPlayerId(pages: Page[]): Promise<string> {
  for (const p of pages) {
    const raw = (await p.locator("#player-word").textContent()) ?? "";
    if (!/you are a spy/i.test(raw)) {
      continue;
    }
    const id =
      (await p
        .locator('[data-testid="e2e-root"]')
        .getAttribute("data-player-id")) ?? "";
    if (id) {
      return id;
    }
  }
  throw new Error(
    "could not find a spy (expected 'You are a spy!' in #player-word)",
  );
}
