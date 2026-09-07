import { expect, test, type Page } from "@playwright/test";

async function dismissPrivacyBanner(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: "Aceitar" });
  if (await accept.isVisible()) {
    await accept.click();
  }
}

async function openRadioBalloon(page: Page): Promise<void> {
  const balloon = page.getByRole("complementary", { name: "Mamute FM" });
  await expect(balloon.getByRole("heading", { level: 2 })).toBeVisible({ timeout: 10_000 });
}

async function collectBalloonOverlaps(page: Page, selectors: string[]): Promise<string[]> {
  return page.evaluate((targetSelectors) => {
    const balloonEl = document.querySelector(".radio-fm-balloon");
    if (!balloonEl) return [];

    const balloonRect = balloonEl.getBoundingClientRect();
    const hits: string[] = [];

    for (const selector of targetSelectors) {
      for (const el of document.querySelectorAll(selector)) {
        if (!(el instanceof HTMLElement)) continue;
        // O balão do hero vive dentro de `#conteudo`, e o título da faixa é um
        // `h2`. Sem este guarda, `#conteudo h2` casa com o próprio visor e a
        // checagem vira autodetecção: um filho sempre se sobrepõe ao pai.
        if (balloonEl.contains(el)) continue;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (el instanceof HTMLInputElement && el.type === "hidden") continue;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const overlap = !(
          balloonRect.right <= rect.left ||
          balloonRect.left >= rect.right ||
          balloonRect.bottom <= rect.top ||
          balloonRect.top >= rect.bottom
        );
        if (overlap) {
          hits.push(`${selector} · ${(el.textContent ?? "").trim().slice(0, 48)}`);
        }
      }
    }

    return hits;
  }, selectors);
}

const FOOTER_SELECTORS = [".site-footer a", ".site-footer p", ".site-footer-legal a"];

const PLANS_SELECTORS = [
  "#assinatura .plan-card a",
  "#assinatura .plan-card button",
  "#assinatura .plans-cycle button",
  ".plans-compare button",
];

const CADASTRO_SELECTORS = [
  ".dj-register-nav .btn",
  ".dj-register-nav .btn-solid",
  ".dj-register-nav-meta",
  ".plan-callout",
];

async function scrollPastRadioReserve(page: Page): Promise<void> {
  const placement = await page.locator(".radio-fm-balloon").getAttribute("data-placement");
  if (placement === "hero") return;

  await page.waitForFunction(() => {
    const reserve = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--radio-fm-reserve-h"),
    );
    return Number.isFinite(reserve) && reserve > 80;
  });
  await page.evaluate(() => {
    const reserve = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--radio-fm-reserve-h"),
    );
    const isMobile = window.matchMedia("(max-width: 720px)").matches;
    const extra = isMobile ? 24 : 12;
    if (Number.isFinite(reserve) && reserve > 0) {
      window.scrollBy(0, reserve + extra);
    }
  });
  await page.waitForTimeout(200);
}

async function scrollFooterClearOfBalloon(page: Page): Promise<void> {
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await scrollPastRadioReserve(page);
}

test.describe("Mamute FM — sem sobrepor conteúdo", () => {
  test("rodapé e CTAs permanecem clicáveis com o balão aberto", async ({ page }) => {
    await page.goto("/");
    await dismissPrivacyBanner(page);
    await openRadioBalloon(page);

    await scrollFooterClearOfBalloon(page);

    const overlaps = await collectBalloonOverlaps(page, [
      ...FOOTER_SELECTORS,
      "a[href*='cadastro']",
      ".plan-card a",
      ".plan-card button",
      "#conteudo h2",
    ]);

    expect(overlaps, `Sobreposição detectada: ${overlaps.join(" | ")}`).toEqual([]);
  });

  test("na home o visor FM ocupa o hero e não invade o header", async ({ page }) => {
    await page.goto("/");
    await dismissPrivacyBanner(page);
    await openRadioBalloon(page);

    const metrics = await page.evaluate(() => {
      const el = document.querySelector(".radio-fm-balloon");
      const header = document.querySelector(".site-header");
      const hero = document.querySelector(".hero");
      if (!el || !header) return null;
      const br = el.getBoundingClientRect();
      const hr = header.getBoundingClientRect();
      return {
        placement: el.getAttribute("data-placement"),
        inHero: Boolean(hero?.contains(el)),
        balloonTop: br.top,
        headerBottom: hr.bottom,
        position: getComputedStyle(el).position,
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.inHero).toBe(true);
    expect(metrics!.placement).toBe("hero");
    expect(metrics!.position).toBe("relative");
    expect(metrics!.balloonTop).toBeGreaterThanOrEqual(metrics!.headerBottom - 4);
  });

  test("seção de planos na home não fica sob o balão aberto", async ({ page }) => {
    await page.goto("/#assinatura");
    await dismissPrivacyBanner(page);
    await openRadioBalloon(page);

    await page.locator("#assinatura").scrollIntoViewIfNeeded();
    await scrollPastRadioReserve(page);

    const overlaps = await collectBalloonOverlaps(page, PLANS_SELECTORS);
    expect(overlaps, `Sobreposição nos planos: ${overlaps.join(" | ")}`).toEqual([]);
  });

  test("cadastro DJ mantém navegação e campos livres do balão", async ({ page }) => {
    await page.goto("/cadastro?plano=bronze");
    await dismissPrivacyBanner(page);
    await openRadioBalloon(page);

    await page.locator(".dj-register-nav").scrollIntoViewIfNeeded();
    await scrollPastRadioReserve(page);

    let overlaps = await collectBalloonOverlaps(page, CADASTRO_SELECTORS);
    expect(overlaps, `Sobreposição no cadastro: ${overlaps.join(" | ")}`).toEqual([]);

    await scrollFooterClearOfBalloon(page);

    overlaps = await collectBalloonOverlaps(page, FOOTER_SELECTORS);
    expect(overlaps, `Sobreposição no cadastro (rodapé): ${overlaps.join(" | ")}`).toEqual([]);
  });
});
