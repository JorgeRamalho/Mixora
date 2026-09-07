import { expect, test } from "@playwright/test";

test.describe("Harmonia · roda Camelot", () => {
  test("home mostra o visor e Harmonia abre página exclusiva", async ({ page }) => {
    await page.goto("/");
    const menu = page.getByRole("button", { name: "Menu" });
    if (await menu.isVisible()) await menu.click();

    const panel = page.locator("#harmony-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Navegue em boa sintonia" })).toBeVisible();
    await expect(panel.getByRole("heading", { name: "Lá menor" })).toBeVisible();

    const wheel = panel.getByRole("radiogroup", { name: /Roda Camelot/ });
    await wheel.getByRole("radio", { name: /8B · Dó maior/ }).click();
    await expect(panel.getByRole("heading", { name: "Dó maior" })).toBeVisible();
    await expect(panel.getByText("8B → 8A → 9A → 9B")).toBeVisible();
    await expect(panel.getByRole("tab", { name: "Como aplicar no set" })).toHaveCount(0);

    const headLink = panel.getByRole("link", {
      name: /Ir para a página Harmonia/,
    });
    await headLink.hover();
    await expect(page).toHaveURL("/");
    await headLink.click();
    await expect(page).toHaveURL(/\/harmonia$/);

    await page.goto("/");
    if (await menu.isVisible()) await menu.click();

    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Harmonia" }).click();
    await expect(page).toHaveURL(/\/harmonia$/);

    const study = page.locator(".harmony-page");
    await expect(study.getByRole("heading", { name: "Navegue em boa sintonia", level: 1 })).toBeVisible();

    const visor = study.locator("#harmonia-visor");
    await expect(visor.getByRole("heading", { name: "Lá menor" })).toBeVisible();
    await visor.getByRole("radio", { name: /8B · Dó maior/ }).click();
    await expect(visor.getByRole("heading", { name: "Dó maior" })).toBeVisible();

    await study.getByRole("tab", { name: "Como aplicar no set" }).click();
    await expect(study.getByText("Leia a key no visor ou nos metadados")).toBeVisible();
    await expect(study.getByRole("link", { name: "Visor Camelot na home" })).toBeVisible();
  });
});
