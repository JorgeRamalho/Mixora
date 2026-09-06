import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };

test.describe("Mixer CDJ — layout, usabilidade e acessibilidade", () => {
  test("desktop: três colunas sem sobreposição nem estouro", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");

    const metrics = await page.evaluate(() => {
      const board = document.querySelector(".mixer-board");
      const deckA = document.querySelector<HTMLElement>(".cdj-deck[data-deck='a']");
      const deckB = document.querySelector<HTMLElement>(".cdj-deck[data-deck='b']");
      const mix = document.querySelector<HTMLElement>(".mixer-console");
      if (!board || !deckA || !deckB || !mix) {
        return { ok: false as const };
      }
      const a = deckA.getBoundingClientRect();
      const b = deckB.getBoundingClientRect();
      const m = mix.getBoundingClientRect();
      const cs = getComputedStyle(board);
      const overflowX = document.documentElement.scrollWidth - window.innerWidth;
      const pitchBeside = ["a", "b"].map((deckId) => {
        const deck = document.querySelector(`.cdj-deck[data-deck='${deckId}']`);
        const jog = deck?.querySelector(".cdj-jog");
        const pitch = deck?.querySelector(".cdj-pitch");
        if (!jog || !pitch) return false;
        const j = jog.getBoundingClientRect();
        const p = pitch.getBoundingClientRect();
        if (deckId === "a") {
          return p.right <= j.left + 8 && p.width > 20;
        }
        return p.left >= j.right - 8 && p.width > 20;
      });
      const eqBoostButtons = document.querySelectorAll(".mixer-eq-boost button").length;
      return {
        ok: true as const,
        cols: cs.gridTemplateColumns.split(" ").length,
        threeCol: a.left < m.left && m.left < b.left && Math.abs(a.top - m.top) < 80,
        // O gap sai do layout, e não do `getBoundingClientRect`, porque a
        // cabine é 3D de propósito: o `translateZ` dos painéis os aproxima da
        // câmera e come o gap inteiro na projeção, embora no fluxo nada se
        // sobreponha. Medido pelo rect, o gap cai a 0,1px já em 1101px de
        // largura, e por isso a asserção seria inalcançável em qualquer
        // viewport de três colunas.
        gapAM: mix.offsetLeft - (deckA.offsetLeft + deckA.offsetWidth),
        gapMB: deckB.offsetLeft - (mix.offsetLeft + mix.offsetWidth),
        heightDelta: Math.abs(a.height - m.height),
        overflowX,
        hotpads: document.querySelectorAll(".cdj-performance-pad").length,
        pitchBeside,
        eqBoostButtons,
        unlabeled: [...document.querySelectorAll(".mixer-cabinet button, .mixer-cabinet input")].filter(
          (el) => {
            const name =
              el.getAttribute("aria-label") ||
              (el instanceof HTMLElement ? el.innerText.trim() : "") ||
              el.closest("label");
            return !name;
          },
        ).length,
      };
    });

    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.cols).toBe(3);
    expect(metrics.threeCol).toBe(true);
    expect(metrics.gapAM).toBeGreaterThanOrEqual(8);
    expect(metrics.gapMB).toBeGreaterThanOrEqual(8);
    expect(metrics.overflowX).toBeLessThanOrEqual(8);
    expect(metrics.hotpads).toBe(8);
    expect(metrics.pitchBeside).toEqual([true, true]);
    expect(metrics.eqBoostButtons).toBe(0);
    expect(metrics.unlabeled).toBe(0);
  });

  test("qualquer viewport: a cabine não gera rolagem horizontal", async ({ page }) => {
    // Sem `setViewportSize` de propósito, ao contrário dos outros casos deste
    // arquivo, que forçam 1440 porque afirmam coisas de três colunas. Era
    // justamente esse `setViewportSize` em toda parte que fazia tablet e
    // celular repetirem o cenário desktop, e por isso um estouro de 170px em
    // 390px passou várias ondas sem ninguém ver.
    await page.goto("/mixer");
    await page.waitForSelector(".mixer-board");

    const medidas = await page.evaluate(() => ({
      viewport: window.innerWidth,
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      // A lista de culpados vai junto para o diagnóstico não exigir uma nova
      // rodada quando a asserção falhar.
      estourando: [...document.querySelectorAll<HTMLElement>(".mixer-cabinet *")]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`)
        .slice(0, 5),
    }));

    expect(medidas.estourando).toEqual([]);
    expect(medidas.overflowX).toBeLessThanOrEqual(8);
  });

  test("usabilidade: play, EQ boost/kill e crossfader", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");

    const deckA = page.getByRole("region", { name: "Deck A" });
    await expect(page.getByRole("region", { name: "Mixer central" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Equalizador de 3 bandas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kill HIGH canal A" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kill MED canal B" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kill LOW canal A" })).toBeVisible();

    await expect(
      page.locator(".mixer-eq-channel[data-channel='a'] .mixer-eq-band").first().locator(".mixer-vol-knob-value"),
    ).toHaveText("50%");

    await page.getByRole("slider", { name: "HIGH canal A" }).fill("100");
    await expect(
      page.locator(".mixer-eq-channel[data-channel='a'] .mixer-eq-band").first().locator(".mixer-vol-knob-value"),
    ).toHaveText("100%");

    await page.getByRole("button", { name: "Kill MED canal A" }).click();
    await expect(page.getByRole("button", { name: "Kill MED canal A" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await deckA.getByRole("button", { name: "Play" }).click();
    await expect(deckA.getByRole("button", { name: "Pause" })).toBeVisible();

    await page.getByLabel("Crossfader").fill("0.2");
    await expect(page.getByLabel("Crossfader")).toHaveValue("0.2");
  });

  test("acessibilidade: nomes, teclado e alvos de 24px no EQ", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");

    await expect(page.getByRole("region", { name: "Deck A" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Deck B" })).toBeVisible();
    await expect(page.getByRole("status", { name: /Controladora MIDI/ })).toBeVisible();
    await expect(page.getByLabel("Jog wheel deck A")).toBeVisible();
    await expect(page.getByRole("slider", { name: "HIGH canal A" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "MED canal B" })).toBeVisible();
    await expect(page.getByLabel("Volume master")).toBeVisible();

    await page.locator("body").press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    const minHit = await page
      .getByLabel("Volume master")
      .locator("..")
      .locator(".mixer-vol-knob-dial")
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
    expect(minHit.w).toBeGreaterThanOrEqual(24);
    expect(minHit.h).toBeGreaterThanOrEqual(24);
  });

  test("facilidade de uso: mixer no centro divide as duas decks", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");

    const order = await page.evaluate(() => {
      const board = document.querySelector(".mixer-board");
      if (!board) return [];
      return [...board.children].map((el) => {
        if (el.classList.contains("mixer-cabinet-head")) return "head";
        if (el.classList.contains("mixer-console")) return "mixer";
        return el.getAttribute("data-deck");
      });
    });
    expect(order).toEqual(["head", "a", "mixer", "b"]);
  });
});
