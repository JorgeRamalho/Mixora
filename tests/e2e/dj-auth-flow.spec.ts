import { expect, test } from "@playwright/test";
import {
  buildTestProfile,
  confirmCodeViaApi,
  loginViaApi,
  registerViaApi,
  sendVerificationCodeViaApi,
  uniqueEmail,
  waitForHealthyApi,
} from "./dj-api-helpers";
import { fillCadastroJourney } from "./cadastro-helpers";

async function dismissPrivacyBanner(page: import("@playwright/test").Page): Promise<void> {
  const accept = page.getByRole("button", { name: "Aceitar" });
  if (await accept.isVisible()) {
    await accept.click();
  }
}

test("UI: link /cadastro/confirmar-email monta o app e valida o token", async ({ page }) => {
  await page.goto(
    "/cadastro/confirmar-email?token=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
  await dismissPrivacyBanner(page);

  await expect(page.getByRole("heading", { name: "Confirme seu e-mail" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("alert")).toContainText(/inválido ou expirado|sem conexão/i, {
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: /reenviar código e link/i })).toBeVisible();
});

test.describe("DJ — cadastro, código e login (automático)", () => {
  let apiReady = false;

  test.beforeAll(async () => {
    apiReady = await waitForHealthyApi();
  });

  test.beforeEach(({ }, testInfo) => {
    test.skip(!apiReady, "API indisponível — execute npm run dev (localhost:8888)");
  });

  test("API: registrar → confirmar código → login", async ({ request }) => {
    const suffix = `api-${Date.now()}`;
    const email = uniqueEmail(suffix);
    const password = "senha1234";
    const profile = buildTestProfile(suffix, email);

    const registered = await registerViaApi(request, profile, password);
    expect(registered.ok, registered.error ?? "register failed").toBe(true);
    expect(registered.emailVerificationRequired).toBe(true);

    const code = registered.devCode;
    expect(code, "devCode ausente — use npm run dev sem RESEND_API_KEY").toBeTruthy();

    const confirmed = await confirmCodeViaApi(request, email, code!);
    expect(confirmed.ok, confirmed.error ?? "confirm failed").toBe(true);
    expect(confirmed.token).toBeTruthy();

    const login = await loginViaApi(request, email, password);
    expect(login.ok, login.error ?? "login failed").toBe(true);
    expect(login.token).toBeTruthy();
  });

  test("API: reenviar código após cadastro", async ({ request }) => {
    const suffix = `resend-${Date.now()}`;
    const email = uniqueEmail(suffix);
    const password = "senha1234";
    const profile = buildTestProfile(suffix, email);

    const registered = await registerViaApi(request, profile, password);
    expect(registered.ok).toBe(true);

    const resent = await sendVerificationCodeViaApi(request, email, password);
    expect(resent.ok, resent.error).toBe(true);
    expect(resent.devCode ?? registered.devCode).toBeTruthy();
  });

  test("UI: cadastro → código na tela → Área do DJ", async ({ page }) => {
    const suffix = `ui-${Date.now()}`;

    await page.goto("/cadastro");
    await dismissPrivacyBanner(page);

    await fillCadastroJourney(page, suffix);
    await page.getByRole("button", { name: "Concluir cadastro" }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`Parabéns, DJ ${suffix}`, "i") })).toBeVisible({
      timeout: 20_000,
    });

    const welcomeText = await page.locator(".dj-register-welcome").textContent();
    const codeFromWelcome = welcomeText?.match(/\b(\d{6})\b/)?.[1];

    await page.goto("/dj");
    await dismissPrivacyBanner(page);

    await page.getByRole("button", { name: "Receber código" }).click();
    await page.getByRole("textbox", { name: "E-mail" }).fill(`${suffix}@mamute.test`);
    await page.getByLabel("Senha do cadastro").fill("senha1234");
    await page.getByRole("button", { name: "Enviar código de verificação" }).click();

    const codeInput = page.getByLabel(/código de verificação/i);
    await expect(codeInput).toBeVisible({ timeout: 15_000 });

    const filled = (await codeInput.inputValue()).trim();
    const code = filled || codeFromWelcome;
    expect(code, "código de verificação não disponível").toMatch(/^\d{6}$/);

    if (!filled) {
      await codeInput.fill(code!);
    }
    await page.getByRole("button", { name: "Confirmar código e entrar" }).click();

    await expect(page.getByText(new RegExp(`DJ ${suffix}`, "i")).first()).toBeVisible({ timeout: 20_000 });
  });
});
