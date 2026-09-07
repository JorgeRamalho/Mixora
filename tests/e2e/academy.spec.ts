import { expect, test } from "@playwright/test";

test.describe("Academia — estrutura e sala de aula", () => {
  test("hero, progresso e seções alinhadas ao conteúdo", async ({ page }) => {
    await page.goto("/academia");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(/primeiro beat/i);
    await expect(page.getByRole("heading", { name: /Módulos, vídeos e checklist/i })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Progresso do curso" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Módulos do curso" })).toBeVisible();
    await expect(page.getByLabel("Aula em exibição")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Dicas e melhores práticas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Laboratório de exercícios" })).toBeVisible();

    const lessonButtons = page.locator(".academy-lesson-btn");
    await expect(lessonButtons).toHaveCount(12);
    await expect(page.getByRole("heading", { name: "Fundação da cabine" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Conclusão de cabine", exact: true })).toBeVisible();

    await expect(page.locator(".academy-tip")).toHaveCount(6);
    await expect(page.locator(".academy-exercise")).toHaveCount(4);
  });

  test("sala de aula troca aula, vídeo e conclusão", async ({ page }) => {
    await page.goto("/academia");

    await expect(page.getByRole("heading", { level: 2, name: /Anatomia da CDJ/i })).toBeVisible();
    await expect(page.locator(".academy-video iframe").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Vídeos complementares" })).toBeVisible();
    await expect(page.getByRole("link", { name: /O que faz cada botão da CDJ-3000/i })).toBeVisible();

    await page.getByRole("button", { name: /Tempo, compassos e contar 32 beats/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Tempo, compassos/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Como contar compassos e frases/i })).toBeVisible();

    await page.getByRole("button", { name: /Ganho, cue de fone/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Ganho, cue de fone/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Gain staging para DJs/i })).toBeVisible();

    await page.getByRole("button", { name: /Pitch fader/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Pitch fader/i })).toBeVisible();
    await expect(page.locator(".academy-theater--lab")).toBeVisible();

    await page.getByRole("button", { name: /Anatomia da CDJ/ }).click();
    await page.getByRole("button", { name: "Concluir aula" }).click();
    await expect(page.getByRole("button", { name: "Desmarcar aula" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: "Progresso do curso" })).toHaveAttribute(
      "aria-valuenow",
      "8",
    );
  });

  test("layout da academia não estoura viewport", async ({ page }) => {
    await page.goto("/academia");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(8);
  });
});
