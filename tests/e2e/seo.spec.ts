import { expect, test } from "@playwright/test";

test.describe("SEO e estrutura", () => {
  test("home expõe título, idioma, meta e landmarks", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/MIXORAPlayerDJ/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /mixer player/i);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /MIXORAPlayerDJ\s+dois decks\. uma harmonia\./i,
    );
    await expect(page.getByLabel("Visor digital MIXORAPlayerDJ")).toBeVisible();
    await expect(page.getByLabel("Feed ao vivo de DJs, músicas e eventos")).toBeVisible();
    const menu = page.getByRole("button", { name: "Menu" });
    if (await menu.isVisible()) await menu.click();
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  });

  test("rotas internas mantêm H1 e navegação", async ({ page }) => {
    const routes = [
      { path: "/mixer", heading: /CDJ Virtual \+ Dual CDJ \+ mixer integrado/ },
      { path: "/academia", heading: /primeiro beat/ },
      { path: "/catalogo", heading: /Plataformas/ },
      { path: "/cadastro", heading: /Cadastro completo/ },
      { path: "/dj", heading: /Entrar no portal/ },
      { path: "/politicas", heading: /Privacidade e cookies/ },
    ];
    for (const route of routes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(route.heading);
      const menu = page.getByRole("button", { name: "Menu" });
      if (await menu.isVisible()) await menu.click();
      await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
    }
  });
});
