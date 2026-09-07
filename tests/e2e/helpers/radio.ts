import { expect, type Page } from "@playwright/test";

export async function dismissPrivacyBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: "Aceitar" });
  if (await accept.isVisible()) {
    await accept.click();
  }
}

/**
 * Avança o player até a plataforma pedida estar no ar.
 *
 * A espera do catálogo usa 30 s de propósito, e não o padrão de 5 s do
 * Playwright, porque `loadRadioMp3Catalog` dispara dezenas de chamadas à
 * Deezer e o atributo `data-catalog-ready` só vira `"true"` depois que essa
 * promise resolve. No ambiente local isso leva cerca de 8 s, e o caso da
 * linha 50 de `radio.spec.ts` já esperava 30 s pelo mesmo atributo e passava,
 * ao passo que este helper herdava 5 s e derrubava doze casos em dois arquivos
 * antes de qualquer asserção de accent.
 *
 * @param page Página já em `/radio`.
 * @param platformId Id da plataforma a colocar no ar, por exemplo `beatport`.
 */
export async function cueRadioPlatform(page: Page, platformId: string): Promise<void> {
  const player = page.getByRole("region", { name: "Mamute DJ · rádio integrada" });
  await expect(player).toHaveAttribute("data-catalog-ready", "true", { timeout: 30_000 });

  const onAir = page.getByLabel("Plataforma no ar").locator("[data-platform]");
  await expect(onAir).toBeVisible();
  const title = player.locator(".radio-dj-title");
  const next = player.getByRole("button", { name: "Próxima faixa" });

  const queued = player.locator(`button.radio-dj-queue-item[data-platform="${platformId}"]`).first();
  if ((await queued.count()) > 0) {
    await queued.click({ force: true });
    await expect(onAir).toHaveAttribute("data-platform", platformId, { timeout: 8_000 });
    return;
  }

  for (let step = 0; step < 40; step += 1) {
    if ((await onAir.getAttribute("data-platform")) === platformId) {
      return;
    }
    const before = (await title.textContent()) ?? "";
    await next.click({ force: true });
    await expect(title).not.toHaveText(before, { timeout: 8_000 });
  }

  await expect(onAir).toHaveAttribute("data-platform", platformId);
}
