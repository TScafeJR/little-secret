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

    await pageTwo.locator("#area").pressSequentially(roomCode as string);
    await contextOne.close();
    await contextTwo.close();
  });
});
