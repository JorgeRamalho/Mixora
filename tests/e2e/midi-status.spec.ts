import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };

const LINK_STATES = ["unavailable", "denied", "disconnected", "connected"];

test.describe("sessão MIDI da cabine", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "chip é o mesmo nas três viewports");
    await page.setViewportSize(DESKTOP);
  });

  test("o chip aparece com nome acessível e um estado conhecido", async ({ page }) => {
    await page.goto("/mixer");

    const chip = page.getByRole("status", { name: /Controladora MIDI/ });
    await expect(chip).toBeVisible();

    // O CI não tem DDJ-400 e o Playwright nega permissão por padrão, e por isso
    // o estado esperado é qualquer um dos quatro, e não `connected`.
    const state = await chip.getAttribute("data-state");
    expect(LINK_STATES).toContain(state);

    if (state !== "unavailable") {
      await expect(page.getByRole("button", { name: "Conectar controladora DDJ-400" })).toBeVisible();
    }
  });

  test("sem controladora a cabine continua inteira e sem erro de runtime", async ({ page }) => {
    const crashes: string[] = [];
    page.on("pageerror", (error) => crashes.push(error.message));

    await page.goto("/mixer");

    await expect(page.getByRole("region", { name: "Deck A" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Deck B" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Mixer central" })).toBeVisible();

    // O mouse não pode depender da sessão MIDI para funcionar.
    await page.getByRole("region", { name: "Deck A" }).getByRole("button", { name: "Play" }).click();
    await expect(
      page.getByRole("region", { name: "Deck A" }).getByRole("button", { name: "Pause" }),
    ).toBeVisible();

    expect(crashes).toEqual([]);
  });

  test("o chip e o botão de religar entram no orçamento de nomes acessíveis", async ({ page }) => {
    await page.goto("/mixer");
    await expect(page.getByRole("status", { name: /Controladora MIDI/ })).toBeVisible();

    const unlabeled = await page.evaluate(
      () =>
        [...document.querySelectorAll(".mixer-cabinet button, .mixer-cabinet input")].filter((el) => {
          const name =
            el.getAttribute("aria-label") ||
            (el instanceof HTMLElement ? el.innerText.trim() : "") ||
            el.closest("label");
          return !name;
        }).length,
    );

    expect(unlabeled).toBe(0);
  });
});
