import { expect, test, type Page } from "@playwright/test";
import { dismissPrivacyBanner } from "./helpers/radio";

async function openMixer(page: Page): Promise<void> {
  const menu = page.getByRole("button", { name: "Menu" });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Mixer CDJ" }).click();
}

test.describe("Rádio — visor flutuante", () => {
  test("na home o visor mostra só a plataforma no ar e não tem botão FM", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissPrivacyBanner(page);

    const balloon = page.getByRole("complementary", { name: "Mamute FM" });
    await expect(balloon).toBeVisible();
    await expect(balloon.getByRole("heading", { level: 2 })).toBeVisible();

    await expect(page.getByRole("button", { name: "FM", exact: true })).toHaveCount(0);
    await expect(balloon.locator(".radio-fm-balloon-fab")).toHaveCount(0);

    const dial = balloon.getByLabel("Plataforma no ar");
    await expect(dial).toBeVisible();
    await expect(dial.locator(".radio-fm-balloon-chip")).toHaveCount(1);
    await expect(balloon.getByText("Hubs da programação")).toHaveCount(0);
    await expect(balloon.getByRole("button", { name: /Ligar rádio|Pausar rádio/ })).toBeVisible();
    await expect(balloon.getByRole("link", { name: "Cabine completa" })).toHaveAttribute("href", /\/radio$/);
  });

  test("o visor some na cabine /radio e no mixer fica no header", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/");
    await dismissPrivacyBanner(page);
    const balloon = page.getByRole("complementary", { name: "Mamute FM" });
    await expect(balloon).toBeVisible();

    await openMixer(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Mamute FM" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ligar Mamute FM" })).toBeVisible();

    await page.getByRole("button", { name: "Ligar Mamute FM" }).click();
    await expect(page.getByRole("complementary", { name: "Mamute FM" })).toBeVisible();

    await page.getByRole("complementary", { name: "Mamute FM" })
      .getByRole("link", { name: "Cabine completa" })
      .click();
    await expect(page.getByRole("heading", { name: "Rádio integrada" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Mamute FM" })).toHaveCount(0);

    await openMixer(page);
    await expect(page.getByRole("complementary", { name: "Mamute FM" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ligar Mamute FM" })).toBeVisible();
  });

  test("minimizar vira botão redondo e fechar leva ao header", async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto("/cadastro?plano=bronze");
    await dismissPrivacyBanner(page);
    const balloon = page.getByRole("complementary", { name: "Mamute FM" });
    await expect(balloon).toBeVisible({ timeout: 10_000 });

    await balloon.getByRole("button", { name: "Minimizar rádio" }).click();
    await expect(balloon).toHaveAttribute("data-shell", "mini");
    await expect(balloon.getByRole("button", { name: "Abrir Mamute FM" })).toBeVisible();

    await balloon.getByRole("button", { name: "Abrir Mamute FM" }).click();
    await expect(balloon).toHaveAttribute("data-shell", "expanded");

    await balloon.getByRole("button", { name: "Fechar rádio" }).click();
    await expect(page.getByRole("complementary", { name: "Mamute FM" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ligar Mamute FM" })).toBeVisible();
  });
});
