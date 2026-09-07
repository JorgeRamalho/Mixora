import { expect, test, type Page } from "@playwright/test";
import {
  BROWSER_NOTE,
  DDJ_STATUS,
  DECK_CC_14BIT,
  DECK_CC_JOG,
  DECK_NOTE,
  HOT_CUE_FIRST_NOTE,
  MIXER_CC_14BIT,
  MIXER_CC_BROWSE,
  type Cc14Bit,
} from "../../src/lib/midi/ddj-400-protocol";
import { JOG_TICKS_PER_NUDGE } from "../../src/lib/midi/midi-scales";

const DESKTOP = { width: 1440, height: 900 };

/**
 * Empurra pacotes crus pela mesma ponte que a porta USB alimenta.
 *
 * @param page Página já em `/mixer`, porque a ponte nasce com o hook.
 * @param messages Lista de `[status, data1, data2]`.
 */
async function inject(page: Page, messages: number[][]): Promise<void> {
  await page.evaluate((batch) => {
    const fn = (window as unknown as { __mamuteMidiInject?: (bytes: number[]) => void })
      .__mamuteMidiInject;
    if (typeof fn !== "function") throw new Error("window.__mamuteMidiInject não existe");
    for (const bytes of batch) fn(bytes);
  }, messages);
}

/**
 * Toca e solta um botão, como o hardware faz.
 *
 * O release vai junto de propósito, porque a DDJ-400 manda um segundo Note On
 * com velocity zero, e é ele que dispararia a ação duas vezes se o mapper não
 * filtrasse o press.
 *
 * @param page Página já em `/mixer`.
 * @param status Canal de note do deck.
 * @param noteNumber Número da note no protocolo.
 */
async function tapNote(page: Page, status: number, noteNumber: number): Promise<void> {
  await inject(page, [
    [status, noteNumber, 0x7f],
    [status, noteNumber, 0x00],
  ]);
}

/**
 * Toca e solta um pad, cujo canal é próprio e separado do transporte.
 *
 * @param page Página já em `/mixer`.
 * @param status Canal de pad do deck.
 * @param index Deslocamento a partir de `HOT_CUE_FIRST_NOTE`.
 */
async function tapPad(page: Page, status: number, index: number): Promise<void> {
  await tapNote(page, status, HOT_CUE_FIRST_NOTE + index);
}

/**
 * Gira um jog por N ticks, que o hardware manda sempre como desvio de ±1.
 *
 * @param page Página já em `/mixer`.
 * @param status Canal MIDI do deck.
 * @param jogCc Número do CC do topo ou da borda.
 * @param ticks Quantos ticks girar para frente.
 */
async function spinJog(page: Page, status: number, jogCc: number, ticks: number): Promise<void> {
  await inject(
    page,
    Array.from({ length: ticks }, () => [status, jogCc, 0x41]),
  );
  // O jog é coalescido em `requestAnimationFrame`, e por isso ler a fase no
  // mesmo tick da injeção pegaria o valor de antes do gesto.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/**
 * Gira o encoder BROWSE em passos, que ele manda em complemento de dois.
 *
 * @param page Página já em `/mixer`.
 * @param steps Passos com sinal, sendo positivo para frente na lista.
 */
async function spinEncoder(page: Page, steps: number): Promise<void> {
  if (steps === 0) return;
  await inject(page, [[DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, steps > 0 ? steps : 0x80 + steps]]);
  // O encoder é acumulativo como o prato, e por isso o destaque só aparece no
  // frame seguinte à injeção.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/**
 * Lê o chip da biblioteca, que é o único espelho do cursor na tela.
 *
 * @param page Página já em `/mixer`.
 */
async function readBrowse(page: Page): Promise<{ title: string; position: number; total: number }> {
  const chip = page.getByRole("status", { name: /^Browse/ });
  await expect(chip).toBeVisible();

  const title = (await chip.locator(".mixer-browse-title").innerText()).trim();
  const meta = await chip.locator(".mixer-browse-meta").innerText();
  const found = /(\d+)\s*\/\s*(\d+)\s*$/.exec(meta.trim());
  if (!found) throw new Error(`chip de browse sem posição: ${meta}`);

  return { title, position: Number(found[1]), total: Number(found[2]) };
}

/**
 * Manda o par MSB/LSB de um controle de 14 bits, na ordem em que a
 * controladora manda.
 *
 * @param page Página já em `/mixer`.
 * @param status Canal MIDI do controle.
 * @param pair Endereço 14-bit do protocolo.
 * @param msb Byte mais significativo.
 * @param lsb Byte menos significativo.
 */
async function send14(
  page: Page,
  status: number,
  pair: Cc14Bit,
  msb: number,
  lsb: number,
): Promise<void> {
  await inject(page, [
    [status, pair.msb, msb],
    [status, pair.lsb, lsb],
  ]);
}

test.describe("físico→virtual sem USB", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "o caminho é o mesmo nas três viewports");
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");
    await expect(page.getByRole("status", { name: /Controladora MIDI/ })).toBeVisible();
  });

  test("channel fader e crossfader movem os sliders da tela", async ({ page }) => {
    await send14(page, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.channelFader, 0x40, 0x00);
    await expect(page.getByLabel("Volume deck A")).toHaveValue("0.5");

    await send14(page, DDJ_STATUS.ccDeckB, DECK_CC_14BIT.channelFader, 0x7f, 0x7f);
    await expect(page.getByLabel("Volume deck B")).toHaveValue("1");

    await send14(page, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.crossfader, 0x7f, 0x7f);
    await expect(page.getByLabel("Crossfader")).toHaveValue("1");
  });

  test("o fader entrega resolução de 14 bits, e não os cem degraus de antes", async ({ page }) => {
    // 0x3A/0x3A fecha 7482 de 16383, que é 0.4566. Com o arredondamento antigo
    // de duas casas isso viraria 0.46, ou seja, o par MSB/LSB não compraria
    // nada além do que um CC de 7 bits já daria.
    await send14(page, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.channelFader, 0x3a, 0x3a);
    await expect(page.getByLabel("Volume deck A")).toHaveValue("0.457");
  });

  test("EQ, filter e os knobs de fone acompanham", async ({ page }) => {
    await send14(page, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.eqHigh, 0x20, 0x00);
    await expect(page.getByRole("slider", { name: "HIGH canal A" })).toHaveValue("25");

    await send14(page, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.filterDeckA, 0x40, 0x00);
    await expect(page.getByRole("slider", { name: "Filter deck A" })).toHaveValue("50");

    await send14(page, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.headphonesLevel, 0x7f, 0x7f);
    await expect(page.getByLabel("Volume booth")).toHaveValue("100");

    await send14(page, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.headphonesMixing, 0x00, 0x00);
    await expect(page.getByLabel("Cue mix headphone")).toHaveValue("0");
  });

  test("rajada de um frame termina no último valor, sem perder o gesto", async ({ page }) => {
    const fader = DECK_CC_14BIT.channelFader;
    await inject(page, [
      [DDJ_STATUS.ccDeckA, fader.msb, 0x10],
      [DDJ_STATUS.ccDeckA, fader.lsb, 0x00],
      [DDJ_STATUS.ccDeckA, fader.msb, 0x30],
      [DDJ_STATUS.ccDeckA, fader.lsb, 0x00],
      [DDJ_STATUS.ccDeckA, fader.msb, 0x60],
      [DDJ_STATUS.ccDeckA, fader.lsb, 0x00],
    ]);

    await expect(page.getByLabel("Volume deck A")).toHaveValue("0.75");
  });

  test("o chip registra a última mensagem, mesmo a que o mapper ignora", async ({ page }) => {
    // O SHIFT existe como endereço mas não vira ação, porque a controladora
    // resolve as combinações no hardware e manda uma note própria para cada uma.
    await inject(page, [[DDJ_STATUS.noteDeckA, DECK_NOTE.shift, 0x7f]]);

    const chip = page.getByRole("status", { name: /Controladora MIDI/ });
    await expect(chip.locator(".mixer-midi-detail")).toContainText("noteOn ch1 n63=127");
  });
});

test.describe("transporte por inject", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "o caminho é o mesmo nas três viewports");
    await page.setViewportSize(DESKTOP);
    await page.goto("/mixer");
    await expect(page.getByRole("status", { name: /Controladora MIDI/ })).toBeVisible();
  });

  test("Play troca o rótulo uma vez, e soltar o botão não troca de novo", async ({ page }) => {
    const deckA = page.getByRole("region", { name: "Deck A" });
    await expect(deckA.getByRole("button", { name: "Play" })).toBeVisible();

    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.play);

    // Se o release virasse ação, o rótulo voltaria para Play na mesma batida.
    await expect(deckA.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(deckA.getByRole("button", { name: "Play" })).toHaveCount(0);

    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.play);
    await expect(deckA.getByRole("button", { name: "Play" })).toBeVisible();
  });

  test("SYNC e MASTER alternam a partir do estado atual, e não de um valor fixo", async ({ page }) => {
    const deckB = page.getByRole("region", { name: "Deck B" });
    const sync = deckB.getByRole("button", { name: "SYNC" });
    await expect(sync).toHaveAttribute("aria-pressed", "false");

    await tapNote(page, DDJ_STATUS.noteDeckB, DECK_NOTE.sync);
    await expect(sync).toHaveAttribute("aria-pressed", "true");

    // O mapper manda intenção, e por isso o segundo toque desliga.
    await tapNote(page, DDJ_STATUS.noteDeckB, DECK_NOTE.sync);
    await expect(sync).toHaveAttribute("aria-pressed", "false");

    await tapNote(page, DDJ_STATUS.noteDeckB, DECK_NOTE.syncLong);
    await expect(deckB.getByRole("button", { name: "MASTER" })).toHaveAttribute("aria-pressed", "true");
  });

  test("o PFL de canal do mixer central responde ao CUE físico", async ({ page }) => {
    const pfl = page.getByRole("button", { name: "Cue monitor deck A" });
    await expect(pfl).toHaveAttribute("aria-pressed", "false");

    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.pfl);
    await expect(pfl).toHaveAttribute("aria-pressed", "true");

    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.pfl);
    await expect(pfl).toHaveAttribute("aria-pressed", "false");
  });

  test("o CUE da deck é ponto de cue, e não monitor de fone", async ({ page }) => {
    const cue = page.getByRole("region", { name: "Deck A" }).getByRole("button", { name: /^Cue deck A/ });
    await expect(cue).toBeVisible();

    // O CUE físico não pode mais acender o PFL, que agora vive no mixer.
    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.cue);
    await expect(page.getByRole("button", { name: "Cue monitor deck A" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("o pitch fader chega à tela invertido, com o detent em zero", async ({ page }) => {
    const pitch = page.getByRole("slider", { name: "Pitch deck A" });

    await send14(page, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.tempo, 0x40, 0x00);
    await expect(pitch).toHaveValue("0");

    // Topo do curso manda zero e vale +8%, e por isso o teste falharia com −8
    // se alguém trocasse `tempoToBipolarUnit` por `bipolarUnit14Bit`.
    await send14(page, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.tempo, 0x00, 0x00);
    await expect(pitch).toHaveValue("8");
    await expect(page.getByRole("region", { name: "Deck A" })).toContainText("8.0%");
  });

  test("o jog empurra a fase, e a roda solta pede quatro vezes mais gesto", async ({ page }) => {
    const deckA = page.getByRole("region", { name: "Deck A" });
    const phaseBefore = Number(await deckA.getAttribute("data-phase"));

    await spinJog(page, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, JOG_TICKS_PER_NUDGE.touched);
    await expect
      .poll(async () => Number(await deckA.getAttribute("data-phase")))
      .not.toBe(phaseBefore);

    // O mesmo número de ticks com a roda solta não move nada, porque bend pede
    // 104 e não 26.
    const afterScratch = Number(await deckA.getAttribute("data-phase"));
    await spinJog(page, DDJ_STATUS.ccDeckA, DECK_CC_JOG.free, JOG_TICKS_PER_NUDGE.touched);
    expect(Number(await deckA.getAttribute("data-phase"))).toBe(afterScratch);
  });

  test("LOOP IN entra, LOOP OUT sai, e apertar duas vezes não desfaz", async ({ page }) => {
    const led = page.locator('.cdj-deck[data-deck="a"] .cdj-status-leds span', { hasText: "LOOP" });
    await expect(led).toHaveAttribute("data-on", "false");

    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.loopIn);
    await expect(led).toHaveAttribute("data-on", "true");

    // Se os três botões fossem o mesmo toggle, este segundo IN desligaria.
    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.loopIn);
    await expect(led).toHaveAttribute("data-on", "true");

    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.loopOut);
    await expect(led).toHaveAttribute("data-on", "false");

    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.loopOut);
    await expect(led).toHaveAttribute("data-on", "false");

    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.reloop);
    await expect(led).toHaveAttribute("data-on", "true");
  });

  test("o pad gravado salta, e o pad vazio grava a posição atual", async ({ page }) => {
    const deckA = page.getByRole("region", { name: "Deck A" });
    const phase = async () => Number(await deckA.getAttribute("data-phase"));

    // O slot 1 nasce gravado na batida zero, e por isso ele salta de primeira.
    await spinJog(page, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 520);
    expect(await phase()).toBeGreaterThan(0.2);

    await tapPad(page, DDJ_STATUS.notePadDeckA, 0);
    await expect.poll(phase).toBe(0);

    // O slot 2 nasce vazio, então o primeiro toque grava e não move nada.
    await spinJog(page, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 520);
    const gravado = await phase();
    await tapPad(page, DDJ_STATUS.notePadDeckA, 1);
    expect(await phase()).toBe(gravado);

    await spinJog(page, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 520);
    expect(await phase()).not.toBe(gravado);

    // O segundo toque salta para o ponto gravado, que o engine arredonda para
    // a grade de oito batidas.
    await tapPad(page, DDJ_STATUS.notePadDeckA, 1);
    await expect.poll(phase).toBe(Math.round(gravado * 8) / 8);
  });

  test("pad fora da faixa de hot cue não mexe na cabine", async ({ page }) => {
    const deckA = page.getByRole("region", { name: "Deck A" });
    await spinJog(page, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 520);
    const antes = await deckA.getAttribute("data-phase");

    // Pad 5, que o engine não tem, e pad 1 em modo Beat Loop, que a
    // controladora manda como note 0x60.
    await tapPad(page, DDJ_STATUS.notePadDeckA, 4);
    await tapPad(page, DDJ_STATUS.notePadDeckA, 0x60 - HOT_CUE_FIRST_NOTE);

    expect(await deckA.getAttribute("data-phase")).toBe(antes);
  });

  test("o encoder move o destaque sem tocar no áudio", async ({ page }) => {
    const partida = await readBrowse(page);
    expect(partida.total).toBeGreaterThan(1);

    // Um controle da cabine serve de testemunha: se o encoder vazasse para o
    // snapshot, o fader mudaria junto do destaque.
    await send14(page, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.channelFader, 0x40, 0x00);
    await expect(page.getByLabel("Volume deck A")).toHaveValue("0.5");

    await spinEncoder(page, 1);
    const depois = await readBrowse(page);
    expect(depois.position).toBe((partida.position % partida.total) + 1);
    expect(depois.title).not.toBe(partida.title);

    await expect(page.getByLabel("Volume deck A")).toHaveValue("0.5");
    await expect(page.getByLabel("Track deck A").locator("option:checked")).not.toContainText(
      depois.title,
    );
  });

  test("o cursor dá a volta na ponta da lista, em vez de travar", async ({ page }) => {
    const partida = await readBrowse(page);

    // Anda até a última faixa e passa dela, que numa biblioteca de cinco itens
    // é gesto comum, e não caso de borda raro.
    await spinEncoder(page, partida.total - partida.position);
    expect((await readBrowse(page)).position).toBe(partida.total);

    await spinEncoder(page, 1);
    expect((await readBrowse(page)).position).toBe(1);

    // Para trás o módulo do JavaScript devolveria −1, e por isso a volta é
    // testada nos dois sentidos.
    await spinEncoder(page, -1);
    expect((await readBrowse(page)).position).toBe(partida.total);
  });

  test("o LOAD joga a faixa destacada na deck, e o select da tela acompanha", async ({ page }) => {
    await spinEncoder(page, 2);
    const destacada = await readBrowse(page);

    await tapNote(page, DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a);
    await expect(page.getByLabel("Track deck A").locator("option:checked")).toContainText(
      destacada.title,
    );

    // A note diz o deck nesta seção, e por isso o LOAD do lado 2 não pode
    // atropelar a deck A.
    await spinEncoder(page, 1);
    const outra = await readBrowse(page);
    await tapNote(page, DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.b);
    await expect(page.getByLabel("Track deck B").locator("option:checked")).toContainText(
      outra.title,
    );
    await expect(page.getByLabel("Track deck A").locator("option:checked")).toContainText(
      destacada.title,
    );
  });

  test("LOAD no mesmo frame do encoder carrega a faixa nova, e não a anterior", async ({ page }) => {
    const partida = await readBrowse(page);

    // O gesto real da controladora, que o helper `spinEncoder` esconde ao
    // esperar o frame: o DJ gira e aperta na mesma fração de segundo, e o
    // botão sai na hora ao passo que o passo do encoder fica na fila.
    await inject(page, [
      [DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, 0x01],
      [DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a, 0x7f],
      [DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a, 0x00],
    ]);

    const destino = await readBrowse(page);
    expect(destino.position).toBe((partida.position % partida.total) + 1);
    await expect(page.getByLabel("Track deck A").locator("option:checked")).toContainText(
      destino.title,
    );
  });

  test("o BACK realinha o destaque com a faixa do deck master", async ({ page }) => {
    // Segurar SYNC manda a note longa e elege a deck A como master, e assim o
    // teste não depende de qual deck nasce master.
    await tapNote(page, DDJ_STATUS.noteDeckA, DECK_NOTE.syncLong);
    await spinEncoder(page, 2);
    await tapNote(page, DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a);

    const carregada = await readBrowse(page);
    await spinEncoder(page, 3);
    expect((await readBrowse(page)).title).not.toBe(carregada.title);

    await tapNote(page, DDJ_STATUS.noteBrowser, BROWSER_NOTE.back);
    expect((await readBrowse(page)).title).toBe(carregada.title);
  });

  test("a latência do gesto fica dentro do orçamento", async ({ page }) => {
    await tapNote(page, DDJ_STATUS.noteDeckB, DECK_NOTE.sync);

    // Medido dentro da página pelo probe do hook, e não por relógio do teste,
    // porque o ida e volta do protocolo do Playwright somaria dezenas de
    // milissegundos que não existem para o DJ.
    const chip = page.locator(".mixer-midi-latency");
    await expect(chip).toBeVisible();

    const totalMs = Number((await chip.innerText()).replace(/[^\d.]/g, ""));
    expect(Number.isFinite(totalMs)).toBe(true);
    expect(totalMs).toBeLessThanOrEqual(80);
    await expect(chip).toHaveAttribute("data-over-budget", "false");
  });
});
