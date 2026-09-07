import { expect, test } from "@playwright/test";
import { BEATPORT_ACCENT, YOUTUBE_ACCENT } from "../../src/data/platform-accents";
import { PLATFORMS } from "../../src/data/platforms";

const LEGACY_BEATPORT_ACCENT = "#01ff95";

function hexToRgb(hex: string): string {
  const normalized = hex.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

const BEATPORT_RGB = hexToRgb(BEATPORT_ACCENT);
const YOUTUBE_RGB = hexToRgb(YOUTUBE_ACCENT);

const LEGACY_YOUTUBE_ACCENT = "#ff0033";

async function readPlatformDotColor(
  page: import("@playwright/test").Page,
  platformId: string,
): Promise<string> {
  const dot = page.locator(`#${platformId} .dot`);
  await expect(dot).toBeVisible();
  return dot.evaluate((el) => getComputedStyle(el).backgroundColor);
}

/**
 * Roadmap Beatport · amarelo (#ffcc00)
 * 1. Token único em platform-accents.ts + --platform-beatport no CSS
 * 2. Dados PLATFORMS (fonte para chips, visor, catálogo)
 * 3. Playwright: catálogo e home
 * 4. Próximo: snapshot visual por viewport; contraste WCAG em chips ativos
 */
test.describe("Beatport · avaliação de cor de marca", () => {
  test("token de dados não usa mais o verde legado", () => {
    const beatport = PLATFORMS.find((platform) => platform.id === "beatport");
    expect(beatport?.accent).toBe(BEATPORT_ACCENT);
    expect(beatport?.accent).not.toBe(LEGACY_BEATPORT_ACCENT);
  });

  test("catálogo /catalogo#beatport exibe dot amarelo", async ({ page }) => {
    await page.goto("/catalogo#beatport");
    await expect(page.getByRole("heading", { name: "Beatport", exact: true })).toBeVisible();
    await expect(readPlatformDotColor(page, "beatport")).resolves.toBe(BEATPORT_RGB);
  });

  test("home · dot Beatport no visor carrossel usa o amarelo", async ({ page }) => {
    await page.goto("/");
    const beatportDot = page.getByRole("tab", { name: /Beatport · plataforma/ });
    await expect(beatportDot).toBeVisible();
    const accent = await beatportDot.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--dot-accent").trim(),
    );
    expect(accent).toBe(BEATPORT_ACCENT);
  });
});

test.describe("YouTube Music · avaliação de cor de marca", () => {
  test("token de dados usa vermelho", () => {
    const youtube = PLATFORMS.find((platform) => platform.id === "youtube");
    expect(youtube?.accent).toBe(YOUTUBE_ACCENT);
    expect(youtube?.accent).not.toBe(LEGACY_YOUTUBE_ACCENT);
  });

  test("catálogo /catalogo#youtube exibe dot vermelho", async ({ page }) => {
    await page.goto("/catalogo#youtube");
    await expect(page.getByRole("heading", { name: "YouTube", exact: true })).toBeVisible();
    await expect(readPlatformDotColor(page, "youtube")).resolves.toBe(YOUTUBE_RGB);
  });

  test("home · dot YouTube no visor carrossel usa vermelho", async ({ page }) => {
    await page.goto("/");
    const youtubeDot = page.getByRole("tab", { name: /YouTube · plataforma/ });
    await expect(youtubeDot).toBeVisible();
    const accent = await youtubeDot.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--dot-accent").trim(),
    );
    expect(accent).toBe(YOUTUBE_ACCENT);
  });
});
