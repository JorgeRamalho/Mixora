import { expect, test, type Page } from "@playwright/test";

const MOBILE_VIEWPORTS = [
  { name: "360px", width: 360, height: 780 },
  { name: "390px", width: 390, height: 844 },
] as const;

async function menuToggle(page: Page) {
  return page.getByRole("button", { name: "Menu" });
}

async function headerMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector(".site-header");
    const toggle = document.querySelector(".menu-toggle");
    const brand = document.querySelector(".brand");
    if (!(header instanceof HTMLElement) || !(toggle instanceof HTMLElement) || !(brand instanceof HTMLElement)) {
      throw new Error("header, menu-toggle ou brand ausente");
    }

    const headerBox = header.getBoundingClientRect();
    const toggleBox = toggle.getBoundingClientRect();
    const brandBox = brand.getBoundingClientRect();

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      header: { top: headerBox.top, right: headerBox.right, bottom: headerBox.bottom, left: headerBox.left },
      toggle: {
        top: toggleBox.top,
        right: toggleBox.right,
        bottom: toggleBox.bottom,
        left: toggleBox.left,
        width: toggleBox.width,
        height: toggleBox.height,
        scrollWidth: toggle.scrollWidth,
        clientWidth: toggle.clientWidth,
        scrollHeight: toggle.scrollHeight,
        clientHeight: toggle.clientHeight,
      },
      brand: { right: brandBox.right, left: brandBox.left },
    };
  });
}

test.describe("Header mobile — botão Menu", () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test(`em ${viewport.name} o Menu cabe no header sem estourar texto nem viewport`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "Cobre o projeto mobile do Playwright");
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");

      const toggle = await menuToggle(page);
      await expect(toggle).toBeVisible();

      const metrics = await headerMetrics(page);

      expect(metrics.toggle.width).toBeGreaterThanOrEqual(40);
      expect(metrics.toggle.height).toBeGreaterThanOrEqual(40);
      expect(metrics.toggle.width).toBeLessThanOrEqual(48);
      expect(metrics.toggle.height).toBeLessThanOrEqual(48);

      expect(metrics.toggle.scrollWidth).toBeLessThanOrEqual(metrics.toggle.clientWidth + 1);
      expect(metrics.toggle.scrollHeight).toBeLessThanOrEqual(metrics.toggle.clientHeight + 1);

      expect(metrics.toggle.left).toBeGreaterThanOrEqual(metrics.header.left - 1);
      expect(metrics.toggle.right).toBeLessThanOrEqual(metrics.header.right + 1);
      expect(metrics.toggle.top).toBeGreaterThanOrEqual(metrics.header.top - 1);
      expect(metrics.toggle.bottom).toBeLessThanOrEqual(metrics.header.bottom + 1);
      expect(metrics.toggle.right).toBeLessThanOrEqual(metrics.viewport.width + 1);

      expect(metrics.toggle.left).toBeGreaterThanOrEqual(metrics.brand.right - 1);
      expect(metrics.header.right - metrics.toggle.right).toBeLessThanOrEqual(24);
      expect(metrics.documentOverflow).toBeLessThanOrEqual(8);
    });
  }

  test("abrir e fechar o Menu no mobile não estoura o layout e revela a navegação", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Cobre o projeto mobile do Playwright");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const toggle = await menuToggle(page);
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // O link é procurado **dentro** da navegação, e não na página inteira,
    // porque o FAQ da cabine ganhou um CTA "Abrir mixer CDJ" cujo nome
    // acessível contém "Mixer CDJ". Buscar solto casava com os dois e violava
    // o modo estrito, embora o assunto do teste seja só o menu.
    const nav = page.getByRole("navigation", { name: "Principal" });
    const mixerLink = nav.getByRole("link", { name: "Mixer CDJ" });

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav).toBeVisible();
    await expect(mixerLink).toBeVisible();

    const overflowOpen = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowOpen).toBeLessThanOrEqual(8);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(mixerLink).toBeHidden();
  });
});
