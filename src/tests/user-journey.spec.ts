import { test, expect, Browser } from "@playwright/test";

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

test.describe("main user journey path", () => {
  test("game", async ({ browser }: { browser: Browser }) => {
    const contextOne = await browser.newContext();
    const contextTwo = await browser.newContext();
    const contextThree = await browser.newContext();
    const contextFour = await browser.newContext();

    const pageOne = await contextOne.newPage();
    const pageTwo = await contextTwo.newPage();
    const pageThree = await contextThree.newPage();
    const pageFour = await contextFour.newPage();

    const players = [pageOne, pageTwo, pageThree, pageFour];
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

    const roomCode = await pageOne.textContent("#room-code");
    expect(roomCode).toBeTruthy();

    await Promise.all(
      players.slice(1).map(async (player) => {
        await player
          .locator("#room-code-input")
          .pressSequentially(roomCode as string);
        await player.click("#room-code-submit");
        return player.waitForSelector("#room-code");
      }),
    );

    // Player 1 changes name to host
    await pageOne.locator("#player-name-input").pressSequentially("host");
    await pageOne.click("#player-name-submit");

    // player 2 should see the host update name
    await Promise.all(
      players.map(async (player, i) => {
        if (i !== 0) {
          await expect(player.getByText("host")).toBeVisible();
        }
      }),
    );

    // player 2 changes name to player
    await pageTwo.locator("#player-name-input").pressSequentially("player");
    await pageTwo.click("#player-name-submit");

    // player 1 should see the player update name
    await expect(pageOne.getByText("player", { exact: true })).toBeVisible();

    await pageOne.click("#start-game-btn");
    let wordCount: Record<string, number> = {};

    for (const player of players) {
      const playerWord = await player.textContent("#player-word");
      wordCount = updateWordCount(wordCount, playerWord as string);
    }

    const distinctWords = Object.keys(wordCount);
    expect(distinctWords).toHaveLength(2);

    const counts = Object.values(wordCount).sort();
    expect(counts).toEqual([1, 3]);

    await contextOne.close();
    await contextTwo.close();
    await contextThree.close();
    await contextFour.close();
  });
});
