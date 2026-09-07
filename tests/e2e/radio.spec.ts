import { expect, test, type Page } from "@playwright/test";
import { BEATPORT_ACCENT, YOUTUBE_ACCENT } from "../../src/data/platform-accents";
import { cueRadioPlatform, dismissPrivacyBanner } from "./helpers/radio";

async function openRadio(page: Page): Promise<void> {
  await page.goto("/radio", { waitUntil: "domcontentloaded" });
  await dismissPrivacyBanner(page);
  await expect(page.getByRole("heading", { name: "Rádio integrada" })).toBeVisible();
}

test.describe("Rádio — melhorias do visor contínuo", () => {
  test("o botão FM não existe na home nem na cabine", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissPrivacyBanner(page);

    await expect(page.getByRole("button", { name: "FM", exact: true })).toHaveCount(0);
    await expect(page.locator(".radio-fm-balloon-fab")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Mamute FM (no ar|aberta)/ })).toHaveCount(0);

    await page.goto("/radio", { waitUntil: "domcontentloaded" });
    await dismissPrivacyBanner(page);
    await expect(page.getByRole("button", { name: "FM", exact: true })).toHaveCount(0);
    await expect(page.locator(".radio-fm-balloon-fab")).toHaveCount(0);
  });

  test("a cabine mostra só a plataforma que está no flow, com rádio contínua", async ({ page }) => {
    await openRadio(page);

    const player = page.getByRole("region", { name: "Mamute DJ · rádio integrada" });
    await expect(player).toHaveAttribute("data-continuous", "on");
    await expect(page.getByRole("button", { name: "Alternar rádio contínua" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const onAir = page.getByLabel("Plataforma no ar");
    await expect(onAir.locator(".radio-dj-platform-chip")).toHaveCount(1);
    await expect(page.getByRole("tablist", { name: "Plataformas integradas" })).toHaveCount(0);

    const live = player.locator(".radio-dj-live-badge");
    await expect(live).toHaveText(/AO VIVO|STANDBY/);
    await expect(live).not.toHaveText("NO AR");
  });

  test("o flow avança entre plataformas sem listar os cinco hubs", async ({ page }) => {
    await openRadio(page);

    const player = page.getByRole("region", { name: "Mamute DJ · rádio integrada" });
    await expect(player).toHaveAttribute("data-catalog-ready", "true", { timeout: 30_000 });

    const title = page.locator(".radio-dj-title");
    const firstTitle = (await title.textContent()) ?? "";

    await page.getByRole("button", { name: "Próxima faixa" }).click({ force: true });
    await expect(title).not.toHaveText(firstTitle, { timeout: 8_000 });

    await expect(page.getByLabel("Plataforma no ar").locator(".radio-dj-platform-chip")).toHaveCount(1);
    await expect(page.getByRole("tab", { name: "Beatport" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "YouTube Music" })).toHaveCount(0);
  });

  test("a fila contínua permite pular para uma faixa Beatport e herda o accent", async ({ page }) => {
    await openRadio(page);
    await cueRadioPlatform(page, "beatport");

    const platform = page.locator(".radio-dj-on-air [data-platform='beatport']");
    await expect(platform).toBeVisible();
    await expect(platform).toContainText(/Beatport/i);
    await expect
      .poll(async () =>
        platform.evaluate((el) => getComputedStyle(el).getPropertyValue("--platform-accent").trim()),
      )
      .toBe(BEATPORT_ACCENT);
  });

  test("YouTube Music no flow herda o accent vermelho só quando está no ar", async ({ page }) => {
    await openRadio(page);
    await cueRadioPlatform(page, "youtube");

    const platform = page.locator(".radio-dj-on-air [data-platform='youtube']");
    await expect(platform).toBeVisible();
    await expect(page.getByLabel("Plataforma no ar")).toContainText(/YouTube Music/);
    await expect
      .poll(async () =>
        platform.evaluate((el) => getComputedStyle(el).getPropertyValue("--platform-accent").trim()),
      )
      .toBe(YOUTUBE_ACCENT);
    await expect(page.getByRole("tab", { name: "Spotify" })).toHaveCount(0);
  });

  test("o visor tem pulse grid interativo e reage ao clique", async ({ page }) => {
    await openRadio(page);

    const visor = page.getByLabel("Visor digital Mamute FM");
    const grid = page.getByLabel(/Pulse grid do visor/);
    await expect(visor).toBeVisible();
    await expect(grid).toBeVisible();
    await expect(visor.locator(".radio-hud-marquee-track")).toBeVisible();

    await grid.click({ force: true });
    await expect(visor).toHaveAttribute("data-drop", "true");
    await expect(visor.getByText("CHROMA GRID")).toHaveCount(0);
  });
});
