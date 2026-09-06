import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };

test.describe("LOAD remoto na CDJ virtual", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Web Audio + HTTP, um projeto basta");
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");
    await page.waitForSelector(".mixer-board");
  });

  test("toggle remote → LOAD → deck data-source-kind=file", async ({ page }) => {
    await page.getByRole("radio", { name: "Biblioteca · API" }).click();
    await expect(page.locator(".mixer-cabinet")).toHaveAttribute("data-browse-source", "remote");
    await expect(page.locator(".deck-playlist[data-deck='a'] .deck-playlist-source")).toHaveText(
      "Biblioteca · API online",
    );
    await expect(page.locator(".mixer-browse-chip")).toHaveAttribute("data-loading", "false", {
      timeout: 15_000,
    });
    await expect(page.locator(".mixer-browse-title")).not.toHaveText(/Carregando|vazia/i);

    const title = (await page.locator(".mixer-browse-title").innerText()).trim();
    expect(title.length).toBeGreaterThan(0);

    const optionTexts = await page.getByLabel("Faixas deck A").getByRole("option").allTextContents();
    expect(optionTexts.some((text) => text.includes(title))).toBe(true);

    await page.getByLabel("Carregar deck A").click();
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute(
      "data-source-kind",
      "file",
      { timeout: 30_000 },
    );
    await expect(page.locator(".cdj-deck[data-deck='a']")).toContainText(title);
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-loading", "false");
  });
});
