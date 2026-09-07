import { expect, test } from "@playwright/test";

const LIVE_URL = "http://127.0.0.1:5500/";

async function openLiveHome(page: import("@playwright/test").Page) {
  const response = await page
    .goto(LIVE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 12_000,
    })
    .catch(() => null);

  if (!response?.ok()) return false;

  const cadastrar = page.getByRole("link", { name: "Cadastrar DJ" });
  const blocked = page.locator("[data-live-src-required]");
  await Promise.race([
    cadastrar.waitFor({ state: "visible", timeout: 25_000 }),
    blocked.waitFor({ state: "visible", timeout: 25_000 }),
  ]).catch(() => null);

  if ((await cadastrar.count()) === 0) {
    test.skip(true, "Vite ausente — Go Live não usa dist atrasado");
    return false;
  }
  return true;
}

test.describe("Live Server (porta 5500)", () => {
  test("cadastro novo não herda perfil salvo no visor", async ({ page }) => {
    test.skip(!(await openLiveHome(page)), "Live Server ausente na porta 5500");

    await page.evaluate(() => {
      localStorage.setItem(
        "mamute.dj.profile",
        JSON.stringify({
          fullName: "DJ Antigo",
          artistName: "DJ Live Server",
          email: "antigo@mamute.test",
          city: "Recife",
          country: "Brasil",
          bio: "Não deve aparecer na ficha nova.",
          terms: true,
          over18: true,
        }),
      );
      sessionStorage.removeItem("mamute.dj.session");
    });

    await page.goto(`${LIVE_URL}cadastro`);
    const accept = page.getByRole("button", { name: "Aceitar" });
    if (await accept.isVisible()) await accept.click();

    await expect(page.getByText("Visor atual: DJ Live Server")).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Nome artístico" })).toHaveValue("");
    await expect(page.getByText("0%")).toBeVisible();
  });

  test("header mostra Área DJ ao lado de Cadastrar DJ", async ({ page }) => {
    test.skip(!(await openLiveHome(page)), "Live Server ausente na porta 5500");

    const cta = page.locator(".header-cta");
    await expect(cta.getByRole("link", { name: "Área DJ" })).toBeVisible();
    await expect(cta.getByRole("link", { name: "Cadastrar DJ" })).toBeVisible();
  });

  test("serve o cadastro e os dados novos do visor", async ({ page }) => {
    test.skip(!(await openLiveHome(page)), "Live Server ausente na porta 5500");

    await expect(page.getByRole("link", { name: "Cadastrar DJ" })).toHaveAttribute(
      "href",
      /cadastro/,
    );
    const menu = page.getByRole("button", { name: "Menu" });
    if (await menu.isVisible()) {
      await menu.click();
    }
    await expect(page.getByRole("link", { name: "Plataformas" })).toBeVisible();

    await page.getByRole("link", { name: "Cadastrar DJ" }).click();
    await expect(page).toHaveURL(/\/cadastro/);
    await expect(page.getByRole("heading", { name: "1. Identidade" })).toBeVisible();
    await expect(page.getByRole("button", { name: "08 · Termos" })).toBeVisible();
  });
});
