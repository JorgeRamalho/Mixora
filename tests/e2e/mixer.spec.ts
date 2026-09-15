import { expect, test } from "@playwright/test";
import { waitForLibraryBrowse } from "./helpers/mixer-deck-load";

const DESKTOP = { width: 1920, height: 1080 };

test.describe("Mixer CDJ — layout, usabilidade e acessibilidade", () => {
  test("desktop: três colunas sem sobreposição nem estouro", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");

    const metrics = await page.evaluate(() => {
      const decks = document.querySelector(".mixer-board-decks");
      const deckA = document.querySelector<HTMLElement>(".cdj-deck[data-deck='a']");
      const deckB = document.querySelector<HTMLElement>(".cdj-deck[data-deck='b']");
      const mix = document.querySelector<HTMLElement>(".mixer-console");
      if (!decks || !deckA || !deckB || !mix) {
        return { ok: false as const };
      }
      const a = deckA.getBoundingClientRect();
      const b = deckB.getBoundingClientRect();
      const m = mix.getBoundingClientRect();
      const cs = getComputedStyle(decks);
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
        deckSizeDelta: Math.max(Math.abs(a.width - b.width), Math.abs(a.height - b.height)),
        overflowX,
        hotpads: document.querySelectorAll(".cdj-performance-pad").length,
        inlinePlaylists: document.querySelectorAll(".deck-playlist[data-variant='inline']").length,
        collections: document.querySelectorAll(".collection-browser").length,
        waveforms: Boolean(document.querySelector(".mixer-waveforms")),
        deckWaves: document.querySelectorAll(".cdj-deck-wave").length,
        roundCue: document.querySelectorAll(".cdj-btn--round.cdj-btn--cue").length,
        roundPlay: document.querySelectorAll(".cdj-btn--round.cdj-btn--play").length,
        hotCueModeDisabled: document.querySelectorAll(".cdj-pad-mode[disabled]").length,
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
    expect(metrics.hotpads).toBe(16);
    expect(metrics.inlinePlaylists).toBe(0);
    expect(metrics.collections).toBe(1);
    expect(metrics.waveforms).toBe(true);
    expect(metrics.deckWaves).toBe(2);
    expect(metrics.roundCue).toBe(2);
    expect(metrics.roundPlay).toBe(2);
    expect(metrics.hotCueModeDisabled).toBe(2);
    expect(metrics.pitchBeside).toEqual([true, true]);
    expect(metrics.deckSizeDelta).toBeLessThanOrEqual(1);
    expect(metrics.eqBoostButtons).toBe(0);
    expect(metrics.unlabeled).toBe(0);
  });

  test("palco herda a cor Camelot ao vivo no html e na cabine", async ({ page }) => {
    await page.goto("/mixer");
    await page.waitForSelector(".mixer-cabinet");
    const theme = await page.evaluate(() => {
      const cabinet = document.querySelector<HTMLElement>(".mixer-cabinet");
      if (!cabinet) return null;
      const live = getComputedStyle(cabinet).getPropertyValue("--camelot-live").trim();
      const htmlLive = getComputedStyle(document.documentElement).getPropertyValue("--camelot-live").trim();
      return { live, htmlLive, playing: cabinet.getAttribute("data-playing") };
    });
    expect(theme?.live).toMatch(/^#[0-9a-f]{6}$/i);
    expect(theme?.htmlLive.toLowerCase()).toBe(theme?.live.toLowerCase());
    expect(theme?.playing).toBe("false");
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
    await expect(page.getByRole("slider", { name: "HIGH canal A" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "MID canal B" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "LOW canal A" })).toBeVisible();

    await expect(page.getByRole("slider", { name: "HIGH canal A" })).toHaveAttribute("aria-valuetext", "50%");

    await page.getByRole("slider", { name: "HIGH canal A" }).fill("100");
    await expect(page.getByRole("slider", { name: "HIGH canal A" })).toHaveAttribute("aria-valuetext", "100%");

    await deckA.getByRole("button", { name: "Play", exact: true }).click();
    await expect(deckA.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

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
    await expect(page.getByRole("slider", { name: "MID canal B" })).toBeVisible();
    await expect(page.getByLabel("Cue mix headphone")).toBeVisible();
    await expect(page.getByLabel("Level headphone")).toBeVisible();
    await expect(page.getByLabel("Volume master")).toHaveCount(0);

    await page.locator("body").press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();

    const minHit = await page.locator(".mixer-monitor-knobs--hero .mixer-vol-knob-dial").first().evaluate((el) => {
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
        if (el.classList.contains("mixer-waveforms")) return "waves";
        if (el.classList.contains("mixer-board-decks")) return "decks";
        if (el.classList.contains("collection-browser")) return "collection";
        return el.className;
      });
    });
    expect(order).toEqual(["waves", "decks", "collection"]);
  });

  test("chrome global: MIDI no header e collection sem toggle de fonte", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");

    await expect(page.locator(".mixer-cabinet-head")).toHaveCount(0);
    await expect(page.locator(".mixer-status-chrome")).toHaveCount(0);
    await expect(page.locator(".header-cta .mixer-browse-source")).toHaveCount(0);
    await expect(page.locator(".mixer-header-midi")).toBeVisible();
    await expect(page.locator(".collection-browser .mixer-browse-source")).toHaveCount(0);
    await expect(page.getByRole("radiogroup", { name: "Fonte da biblioteca" })).toHaveCount(0);
    await expect(page.locator(".mixer-cabinet")).toHaveAttribute("data-browse-source", "remote");
  });

  test("collection: lista visível com altura útil sem a status bar", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");

    const collection = page.locator(".collection-browser");
    await expect(collection).toBeVisible();
    await expect(page.locator(".collection-track-row").first()).toBeVisible();

    const height = await collection.evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThan(120);
  });

  test("collection: gênero e arraste carregam o deck A", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");
    await waitForLibraryBrowse(page);

    const rowsBefore = await page.locator(".collection-track-row").count();
    expect(rowsBefore).toBeGreaterThan(1);

    const genreItem = page.locator('.collection-genre-item[data-genre-item]:not([data-genre-item="all"])').first();
    await expect(genreItem).toBeVisible();
    await genreItem.click();
    const rowsAfterGenre = await page.locator(".collection-track-row").count();
    expect(rowsAfterGenre).toBeGreaterThan(0);
    expect(rowsAfterGenre).toBeLessThanOrEqual(rowsBefore);

    await page.locator('.collection-genre-item[data-genre-item="all"]').click();
    await expect.poll(async () => page.locator(".collection-track-row").count()).toBeGreaterThan(1);

    const dragRow = page.locator(".collection-track-row").nth(1);
    const title = (await dragRow.locator(".collection-track-title").innerText()).trim();
    const deck = page.locator(".cdj-deck[data-deck='a']");
    await dragRow.scrollIntoViewIfNeeded();
    await deck.scrollIntoViewIfNeeded();
    await dragRow.dragTo(deck, { force: true, targetPosition: { x: 48, y: 48 } });
    await expect(deck).toContainText(title);
  });

  test("collection: digitação no header recorta por artista", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");
    await waitForLibraryBrowse(page);

    const artistFilter = page.locator('[data-column-filter="artist"]');
    await expect(artistFilter).toBeVisible();
    const rowsBefore = await page.locator(".collection-track-row").count();
    expect(rowsBefore).toBeGreaterThan(1);

    await artistFilter.fill("daft");
    await expect
      .poll(async () => {
        const artists = await page.locator(".collection-track-artist").allInnerTexts();
        return artists.length > 0 && artists.every((name) => name.toLowerCase().includes("daft"));
      }, { timeout: 8_000 })
      .toBe(true);
    expect(await page.locator(".collection-track-row").count()).toBeLessThanOrEqual(rowsBefore);
  });

  test("deck Rekordbox: waveform no CDJ, pads HOT CUE e CUE/Play circulares", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");
    await page.waitForSelector(".cdj-deck[data-deck='a']");

    const deckA = page.locator(".cdj-deck[data-deck='a']");
    await expect(deckA.locator(".cdj-deck-wave")).toBeVisible();
    await expect(deckA.locator(".cdj-pad-mode")).toBeDisabled();
    await expect(deckA.locator(".cdj-pad-mode")).toHaveValue("hotcue");
    await expect(deckA.locator(".cdj-btn--round.cdj-btn--cue")).toBeVisible();
    await expect(deckA.locator(".cdj-btn--round.cdj-btn--play")).toBeVisible();
    await expect(page.locator(".mixer-waveforms")).toBeVisible();
    await expect(deckA.locator(".cdj-performance-pad")).toHaveCount(8);
  });
});
