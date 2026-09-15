import { expect, test } from "@playwright/test";
import { waitForLibraryBrowse } from "./helpers/mixer-deck-load";

const DESKTOP = { width: 1920, height: 1080 };

test.describe("LOAD remoto na CDJ virtual", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Web Audio + HTTP, um projeto basta");
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");
    await page.waitForSelector(".mixer-board");
  });

  test("API default → LOAD → deck data-source-kind=file", async ({ page }) => {
    await waitForLibraryBrowse(page);
    await expect(page.locator(".mixer-cabinet")).toHaveAttribute("data-browse-source", "remote");

    const title = (
      await page.locator(".collection-track-row[data-browse-focus='true'] .collection-track-title").innerText()
    ).trim();
    expect(title.length).toBeGreaterThan(0);

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
