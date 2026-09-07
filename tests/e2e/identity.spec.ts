import { expect, test } from "@playwright/test";

test.describe("Identidade visual e responsividade", () => {
  test("tipografia e tokens CSS estão no documento", async ({ page }) => {
    await page.goto("/");
    const fonts = await page.evaluate(() => {
      const styles = getComputedStyle(document.body);
      return {
        body: styles.fontFamily,
        display: getComputedStyle(document.querySelector("h1")!).fontFamily,
        cyan: getComputedStyle(document.documentElement).getPropertyValue("--cyan").trim(),
        void: getComputedStyle(document.documentElement).getPropertyValue("--void").trim(),
        themeColor: document
          .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
          ?.content.trim()
          .toLowerCase(),
      };
    });
    expect(fonts.body).toMatch(/Outfit/i);
    expect(fonts.display).toMatch(/Syne/i);
    expect(fonts.cyan).toBe("#3ee8d6");
    expect(fonts.void).toBe("#07060c");
    // O `theme-color` existe para a barra do navegador móvel se fundir com o
    // fundo da página, e o fundo do `body` é `var(--void)`. Amarrar um ao
    // outro transforma um desalinho silencioso em falha, porque o token já
    // andou uma vez sem o `index.html` acompanhar.
    expect(fonts.themeColor).toBe(fonts.void);
  });

  test("layout não estoura viewport e o visor permanece no fluxo", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(8);
    await expect(page.getByText("MIXORA OS 1.0")).toBeVisible();
    await expect(page.getByText("MIXORA").first()).toBeVisible();
    await expect(page.getByText("Beatport").first()).toBeVisible();
  });

  test("header oferece navegação em qualquer projeto", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Principal" });
    const menu = page.getByRole("button", { name: "Menu" });
    if (await menu.isVisible()) {
      await menu.click();
      await expect(nav.getByRole("link")).toHaveText([
        "Início",
        "Harmonia",
        "Sala de Aula",
        "Mixer CDJ",
        "Plataformas",
        "Área DJ",
      ]);
    } else {
      await expect(nav.getByRole("link")).toHaveText([
        "Início",
        "Harmonia",
        "Sala de Aula",
        "Mixer CDJ",
        "Plataformas",
      ]);
      await expect(page.locator(".header-cta").getByRole("link", { name: "Área DJ" })).toBeVisible();
    }
    await nav.getByRole("link", { name: "Mixer CDJ" }).click();
    await expect(page).toHaveURL(/\/mixer/);
  });
});
