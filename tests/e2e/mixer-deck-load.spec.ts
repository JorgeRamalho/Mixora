import { expect, test, type Page } from "@playwright/test";
import {
  BROWSER_NOTE,
  DDJ_STATUS,
  DECK_NOTE,
  HOT_CUE_FIRST_NOTE,
  MIXER_NOTE,
} from "../../src/lib/midi/ddj-400-protocol";
import { uploadToDeck, waitForLibraryBrowse } from "./helpers/mixer-deck-load";

const DESKTOP = { width: 1440, height: 900 };

test.describe("P4 load de arquivo no deck", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Web Audio + file input, um projeto basta");
    page.on("dialog", (dialog) => dialog.dismiss());
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");
    await page.waitForSelector(".mixer-board");
    await waitForLibraryBrowse(page);
  });

  test("E01 LOAD virtual deck A", async ({ page }) => {
    await expect(page.getByLabel("Carregar deck A")).toBeVisible();
    await uploadToDeck(page, "a");
    await expect(page.locator(".cdj-deck[data-deck='a']")).toContainText("mixer-kick-120bpm");
  });

  test("E02 Play após load", async ({ page }) => {
    await uploadToDeck(page, "a");
    await page.locator(".cdj-deck[data-deck='a']").getByRole("button", { name: "Play", exact: true }).click({ force: true });
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-playing", "true");
    await expect(page.locator(".cdj-deck[data-deck='a']").getByRole("button", { name: "Pause" })).toBeVisible();
  });

  test("E03 BPM exibido 120", async ({ page }) => {
    await uploadToDeck(page, "a");
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-bpm", /120/);
  });

  test("E04 KEY visível", async ({ page }) => {
    await uploadToDeck(page, "a");
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-key", "—");
  });

  test("E05 CUE grava e salta", async ({ page }) => {
    const deck = page.locator(".cdj-deck[data-deck='a']");
    await uploadToDeck(page, "a");
    await deck.getByRole("button", { name: /^Cue deck A/ }).click();
    await expect(deck).toHaveAttribute("data-cue-sec", "0");
    await deck.getByRole("button", { name: "Play", exact: true }).click({ force: true });
    await expect.poll(async () => Number(await deck.getAttribute("data-phase")), {
      timeout: 3000,
    }).toBeGreaterThan(0.08);
    await deck.getByRole("button", { name: /^Cue deck A/ }).click();
    await expect.poll(async () => Number(await deck.getAttribute("data-phase")), {
      timeout: 3000,
    }).toBeLessThan(0.08);
  });

  test("E06 LOAD deck B não afeta A", async ({ page }) => {
    await uploadToDeck(page, "a");
    await uploadToDeck(page, "b");
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-source-kind", "file");
    await expect(page.locator(".cdj-deck[data-deck='b']")).toHaveAttribute("data-source-kind", "file");
  });

  test("E07 LOAD MIDI carrega a faixa do cursor da API", async ({ page }) => {
    const title = (await page.locator(".collection-track-row[data-browse-focus='true'] .collection-track-title").innerText()).trim();
    await inject(page, [
      [DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a, 0x7f],
      [DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a, 0x00],
    ]);
    await expect(page.locator(".cdj-deck[data-deck='a']")).toContainText(title, { timeout: 30_000 });
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-load-pending", "false");
  });

  test("E08 Crossfader com arquivo", async ({ page }) => {
    await uploadToDeck(page, "a");
    await page.locator(".cdj-deck[data-deck='a']").getByRole("button", { name: "Play", exact: true }).click({ force: true });
    await page.getByLabel("Crossfader").fill("1");
    await expect(page.locator(".mixer-xfader")).toHaveAttribute("data-xf", "1");
  });

  test("E09 EQ HIGH após load", async ({ page }) => {
    await uploadToDeck(page, "a");
    await page.getByRole("slider", { name: "HIGH canal A" }).fill("100");
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-eq-high", "12");
  });

  test("E10 Waveform peaks", async ({ page }) => {
    await uploadToDeck(page, "a");
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-peaks-ready", "true");
  });

  test("E11 Sync entre decks", async ({ page }) => {
    await uploadToDeck(page, "a");
    await uploadToDeck(page, "b");
    await page.locator(".cdj-deck[data-deck='b']").getByRole("button", { name: "BEAT SYNC", exact: true }).click({ force: true });
    const pitch = await page.locator(".cdj-deck[data-deck='b']").getAttribute("data-pitch");
    expect(pitch).toBeTruthy();
  });

  test("E12 Hot cue pad MIDI", async ({ page }) => {
    await uploadToDeck(page, "a");
    await page.locator(".cdj-deck[data-deck='a']").getByRole("button", { name: "Play", exact: true }).click({ force: true });
    await tapNote(page, DDJ_STATUS.notePadDeckA, HOT_CUE_FIRST_NOTE + 1);
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-playing", "true");
  });

  test("E13 Loop IN LED", async ({ page }) => {
    await uploadToDeck(page, "a");
    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.loopIn);
    await expect(page.locator(".cdj-deck[data-deck='a']")).toHaveAttribute("data-loop-active", "true");
  });

  test("E14 PFL toggle", async ({ page }) => {
    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.pfl);
    await expect(page.getByRole("button", { name: "Cue monitor deck A" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("E14b MASTER CUE toggle", async ({ page }) => {
    await tapNote(page, DDJ_STATUS.noteBrowser, MIXER_NOTE.masterCue);
    await expect(page.getByRole("button", { name: "Master cue headphone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("E15 arquivo no deck B não desvia o load da API no A", async ({ page }) => {
    const title = (await page.locator(".collection-track-row[data-browse-focus='true'] .collection-track-title").innerText()).trim();
    await inject(page, [
      [DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a, 0x7f],
      [DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a, 0x00],
    ]);
    await expect(page.locator(".cdj-deck[data-deck='a']")).toContainText(title, { timeout: 30_000 });

    await uploadToDeck(page, "b");

    await expect(page.locator(".cdj-deck[data-deck='b']")).toHaveAttribute("data-source-kind", "file");
    await expect(page.locator(".cdj-deck[data-deck='b']")).toContainText("mixer-kick-120bpm");
    await expect(page.locator(".cdj-deck[data-deck='a']")).toContainText(title);
  });
});

/**
 * Empurra bytes na ponte MIDI da página.
 *
 * @param page Página em `/mixer`.
 * @param messages Pacotes `[status, d1, d2]`.
 */
async function inject(page: Page, messages: number[][]): Promise<void> {
  await page.evaluate((batch) => {
    const fn = (window as unknown as { __mamuteMidiInject?: (bytes: number[]) => void })
      .__mamuteMidiInject;
    if (typeof fn !== "function") throw new Error("window.__mamuteMidiInject não existe");
    for (const bytes of batch) fn(bytes);
  }, messages);
}

/**
 * Press e release de uma note.
 *
 * @param page Página em `/mixer`.
 * @param status Status byte.
 * @param note Número da note.
 */
async function tapNote(page: Page, status: number, note: number): Promise<void> {
  await inject(page, [
    [status, note, 0x7f],
    [status, note, 0],
  ]);
}
