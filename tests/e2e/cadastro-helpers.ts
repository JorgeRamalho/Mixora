import { expect, type Page } from "@playwright/test";

export async function continueCadastro(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continuar" }).click();
}

/** Preenche o mínimo obrigatório e avança as 8 etapas até o botão de concluir. */
export async function fillCadastroJourney(page: Page, suffix: string): Promise<void> {
  await page.getByRole("textbox", { name: "Nome completo" }).fill(`Nome ${suffix}`);
  await page.getByRole("textbox", { name: "Nome artístico" }).fill(`DJ ${suffix}`);
  await page.getByRole("textbox", { name: "Cidade" }).fill("São Paulo");
  await continueCadastro(page);

  await expect(page.getByRole("heading", { name: "2. Contato" })).toBeVisible();
  await page.getByRole("textbox", { name: "E-mail" }).fill(`${suffix}@mamute.test`);
  await page.getByLabel("Senha", { exact: true }).fill("senha1234");
  await page.getByLabel("Confirmar senha").fill("senha1234");
  await continueCadastro(page);

  await expect(page.getByRole("heading", { name: "3. Perfil artístico" })).toBeVisible();
  await page.getByRole("textbox", { name: "Bio" }).fill(`Bio ${suffix}`);
  await page.getByLabel("Techno").click();
  await continueCadastro(page);

  await expect(page.getByRole("heading", { name: "4. Equipamento" })).toBeVisible();
  await page.getByLabel("CDJ").click();
  await continueCadastro(page);
  await expect(page.getByRole("heading", { name: "5. Presença digital" })).toBeVisible();
  await page.getByRole("textbox", { name: "Instagram" }).fill(`@${suffix}`);
  await continueCadastro(page);
  await expect(page.getByRole("heading", { name: "6. Carreira" })).toBeVisible();
  await continueCadastro(page);
  await expect(page.getByRole("heading", { name: "7. Aprendizado" })).toBeVisible();
  await continueCadastro(page);

  await expect(page.getByRole("heading", { name: "8. Termos" })).toBeVisible();
  await page.getByText("Tenho 18 anos ou mais").click();
  await page.getByText("Aceito os termos de uso").click();
}
