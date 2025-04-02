import { test, expect, Browser, Page } from "@playwright/test";

const appUrl = "http://localhost:5173";

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

const getPlayers = async (
  browser: Browser,
  numPlayers: number,
): Promise<Page[]> => {
  const players: Page[] = [];
  for (let i = 0; i < numPlayers; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    players.push(page);
  }
  return players;
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

const runTest = async (browser: Browser, numPlayers: number) => {
  const players = await getPlayers(browser, numPlayers);
  await Promise.all(
    players.map(async (player) => {
      return player.goto(appUrl);
    }),
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

  const host = players[0];

  const roomCode = await host.textContent("#room-code");
  expect(roomCode).toBeTruthy();

  await Promise.all(
    players.slice(1).map(async (player) => {
      await player
        .locator("#room-code-input")
        .pressSequentially(roomCode as string);
      await player.click("#room-code-submit");
      await expect(player.locator("#room-code")).toBeVisible();
    }),
  );

  /** hide this logic for now. not a core peice of funcitonality
		await host.locator("#player-name-input").pressSequentially("host");
		await host.click("#player-name-submit");

		for (const player of players.slice(1)) {
			await expect(player.getByText("host")).toBeVisible({ timeout: 3000 });
		}

		// player 2 changes name to player
		await players[1].locator("#player-name-input").pressSequentially("player");
		await players[1].click("#player-name-submit");

		// player 1 should see the player update name
		await expect(host.getByText("player", { exact: true })).toBeVisible();
	*/

  await host.click("#start-game-btn");
  let wordCount: Record<string, number> = {};

  for (const player of players) {
    const wordEl = player.locator("#player-word");
    await expect(wordEl).toBeVisible({ timeout: 3000 });
    const playerWord = await wordEl.textContent();
    wordCount = updateWordCount(wordCount, playerWord as string);
  }

  const order = testConfig[numPlayers.toString()].sortOrder;

  const distinctWords = Object.keys(wordCount);
  expect(distinctWords).toHaveLength(order.length);

  const counts = Object.values(wordCount).sort();
  expect(counts).toEqual(order);

  await Promise.all(
    players.map(async (player) => {
      await player.waitForSelector("#confirm-word-btn", { timeout: 2000 });
      return player.click("#confirm-word-btn");
    }),
  );

  for (const player of players) {
    await player.close();
  }
};

test.describe("main user journey path", () => {
  test("4 player game", async ({ browser }: { browser: Browser }) => {
    await runTest(browser, 4);
  });
  test("5 player game", async ({ browser }: { browser: Browser }) => {
    await runTest(browser, 5);
  });
  test("6 player game", async ({ browser }: { browser: Browser }) => {
    await runTest(browser, 6);
  });
  test("7 player game", async ({ browser }: { browser: Browser }) => {
    await runTest(browser, 7);
  });
  test("8 player game", async ({ browser }: { browser: Browser }) => {
    await runTest(browser, 8);
  });
});
