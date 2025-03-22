import { test, expect, Browser } from "@playwright/test";

const appUrl = "http://localhost:5173";

test.describe("main user journey path", () => {
  test("game", async ({ browser }: { browser: Browser }) => {
    const contextOne = await browser.newContext();
    const contextTwo = await browser.newContext();
    const pageOne = await contextOne.newPage();
    const pageTwo = await contextTwo.newPage();
    await pageOne.goto(appUrl);
    await pageTwo.goto(appUrl);
    await pageOne.click("#host-btn");
    await pageTwo.click("#player-btn");

    const roomCode = await pageOne.textContent("#room-code");
    expect(roomCode).toBeTruthy();

    // Player 2 joins the game
    await pageTwo
      .locator("#room-code-input")
      .pressSequentially(roomCode as string);
    await pageTwo.click("#room-code-submit");
    await pageTwo.waitForSelector("#room-code");

    // Player 1 changes name to host
    await pageOne.locator("#player-name-input").pressSequentially("host");
    await pageOne.click("#player-name-submit");

    // player 2 should see the host update name
    await expect(pageTwo.getByText("1. host")).toBeVisible();

    // player 1 should have the update as well
    await expect(pageOne.getByText("1. host")).toBeVisible();

    // player 2 changes name to player
    await pageTwo.locator("#player-name-input").pressSequentially("player");
    await pageTwo.click("#player-name-submit");

    // player 1 should see the player update name
    await expect(pageOne.getByText("2. player")).toBeVisible();

    // player 2 should have the update as well
    await expect(pageTwo.getByText("2. player")).toBeVisible();

    await contextOne.close();
    await contextTwo.close();
  });
});
