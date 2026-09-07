import { expect, test, type Locator, type Page } from "@playwright/test";

async function dismissPrivacyBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: "Aceitar" });
  await accept.click({ timeout: 4_000 }).catch(() => undefined);
}

async function openLogin(page: Page): Promise<void> {
  await page.goto("/dj");
  await dismissPrivacyBanner(page);
  await expect(page.getByRole("heading", { name: "Entrar no portal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Login da cabine" })).toBeVisible();
}

async function typeWithoutLosingValue(field: Locator, value: string): Promise<void> {
  await field.click();
  await field.fill("");
  await field.evaluate((el) => {
    el.dataset.mamuteTypingProbe = "1";
  });
  await field.pressSequentially(value, { delay: 35 });
  await expect(field).toHaveValue(value);
  await expect(field).toBeFocused();
  const sameNode = await field.evaluate((el) => el.dataset.mamuteTypingProbe === "1");
  expect(sameNode).toBe(true);
}

test.describe("Área do DJ — digitação no login", () => {
  test("e-mail e senha mantêm o texto letra a letra, sem zerar o campo", async ({ page }) => {
    await openLogin(page);

    const email = page.getByRole("textbox", { name: "E-mail" });
    const password = page.getByLabel("Senha", { exact: true });
    const typedEmail = "jorge.digitacao@mamutedjplayerm.app";
    const typedPassword = "cabine-segura-123";

    await typeWithoutLosingValue(email, typedEmail);
    await typeWithoutLosingValue(password, typedPassword);

    await expect(email).toHaveValue(typedEmail);
    await expect(password).toHaveValue(typedPassword);
    await expect(password).toBeFocused();
  });

  test("digitação continua estável em Esqueci a senha e Receber código", async ({ page }) => {
    await openLogin(page);

    await page.getByRole("button", { name: "Esqueci a senha" }).click();
    await expect(page.getByRole("heading", { name: "Esqueci a senha" })).toBeVisible();
    await typeWithoutLosingValue(
      page.getByRole("textbox", { name: "E-mail" }),
      "esqueci.codigo@mamute.test",
    );

    await page.getByRole("button", { name: "Voltar ao login" }).click();
    await page.getByRole("button", { name: "Receber código" }).click();
    await expect(page.getByRole("heading", { name: "Código de verificação" })).toBeVisible();
    await typeWithoutLosingValue(
      page.getByRole("textbox", { name: "E-mail" }),
      "receber.codigo@mamute.test",
    );
    await expect(page.getByRole("textbox", { name: "E-mail" })).toBeFocused();
  });
});
