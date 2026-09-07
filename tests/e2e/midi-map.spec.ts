import { expect, test } from "@playwright/test";
import { createDdj400MapContext, mapDdj400 } from "../../src/lib/midi/ddj-400-map";
import {
  BROWSER_NOTE,
  DDJ_STATUS,
  DECK_CC_14BIT,
  DECK_CC_JOG,
  DECK_NOTE,
  HOT_CUE_FIRST_NOTE,
  MIXER_CC_14BIT,
  MIXER_CC_BROWSE,
  PAD_COUNT,
} from "../../src/lib/midi/ddj-400-protocol";
import { JOG_TICKS_PER_NUDGE } from "../../src/lib/midi/midi-scales";
import { HOT_CUE_SLOTS } from "../../src/types/mixer";
import { isDdj400PortName, listenMidiInput } from "../../src/lib/midi/midi-session";
import { coalesceMode, createMidiActionQueue } from "../../src/lib/midi/midi-coalesce";
import { parseMidiMessage, type ParsedMidiMessage } from "../../src/lib/midi/parse-message";
import type { MixerAction } from "../../src/types/mixer";


test.describe("mapa MIDI DDJ-400 — knobs e faders", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "mapa puro, um projeto basta");
  });

  test("parser ignora sysex e monta CC com o status original", () => {
    expect(isDdj400PortName("MIDIIN2 (2- DDJ-400)")).toBe(true);
    expect(isDdj400PortName("Pioneer DDJ400")).toBe(true);
    expect(isDdj400PortName("Launchpad Mini")).toBe(false);
    expect(parseMidiMessage(new Uint8Array([0xf0, 0x00, 0x01]))).toBeNull();
    expect(parseMidiMessage(new Uint8Array([DDJ_STATUS.ccDeckA, DECK_CC_14BIT.trim.msb]))).toBeNull();
    expect(parseMidiMessage(new Uint8Array([DDJ_STATUS.ccDeckA, DECK_CC_14BIT.trim.msb, 0x40]))).toEqual({
      status: DDJ_STATUS.ccDeckA,
      channel: 0,
      kind: "cc",
      data1: DECK_CC_14BIT.trim.msb,
      data2: 0x40,
    });
  });

  test("trim, EQ, filter e faders cobrem mínimo, detent e fim de curso", () => {
    const ctx = createDdj400MapContext();

    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.trim, 0, 0)).toEqual({
      type: "trim",
      id: "a",
      value: 0.2,
    });
    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.trim, 0x40, 0)).toEqual({
      type: "trim",
      id: "a",
      value: 0.6,
    });
    expect(send14(ctx, DDJ_STATUS.ccDeckB, DECK_CC_14BIT.trim, 0x7f, 0x7f)).toEqual({
      type: "trim",
      id: "b",
      value: 1,
    });

    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.eqHigh, 0, 0)).toEqual({
      type: "eq",
      id: "a",
      band: "high",
      value: -24,
    });
    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.eqMid, 0x40, 0)).toEqual({
      type: "eq",
      id: "a",
      band: "mid",
      value: 0,
    });
    expect(send14(ctx, DDJ_STATUS.ccDeckB, DECK_CC_14BIT.eqLow, 0x7f, 0x7f)).toEqual({
      type: "eq",
      id: "b",
      band: "low",
      value: 12,
    });

    expect(send14(ctx, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.filterDeckA, 0, 0)).toEqual({
      type: "filter",
      id: "a",
      value: -100,
    });
    expect(send14(ctx, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.filterDeckB, 0x40, 0)).toEqual({
      type: "filter",
      id: "b",
      value: 0,
    });
    expect(send14(ctx, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.filterDeckA, 0x7f, 0x7f)).toEqual({
      type: "filter",
      id: "a",
      value: 100,
    });

    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.channelFader, 0, 0)).toEqual({
      type: "gain",
      id: "a",
      value: 0,
    });
    expect(send14(ctx, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.crossfader, 0x7f, 0x7f)).toEqual({
      type: "xf",
      value: 1,
    });
    expect(send14(ctx, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.headphonesMixing, 0x7f, 0x7f)).toEqual({
      type: "cueMix",
      value: 1,
    });
    expect(send14(ctx, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.headphonesLevel, 0, 0)).toEqual({
      type: "booth",
      value: 0,
    });
  });

  test("EQ negativo usa corte de 24 dB, e não um fator simétrico", () => {
    const ctx = createDdj400MapContext();
    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.eqHigh, 0x20, 0)).toEqual({
      type: "eq",
      id: "a",
      band: "high",
      value: -12,
    });
    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.eqHigh, 0x60, 0)).toEqual({
      type: "eq",
      id: "a",
      band: "high",
      value: 6,
    });
  });

  test("o tempo fader é invertido, porque o topo manda zero e vale +8%", () => {
    const ctx = createDdj400MapContext();

    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.tempo, 0x40, 0)).toEqual({
      type: "pitch",
      id: "a",
      value: 0,
    });

    // Byte baixo é pitch alto. Se a conta não invertesse, este caso daria −8.
    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.tempo, 0, 0)).toEqual({
      type: "pitch",
      id: "a",
      value: 8,
    });
    expect(send14(ctx, DDJ_STATUS.ccDeckB, DECK_CC_14BIT.tempo, 0x7f, 0x7f)).toEqual({
      type: "pitch",
      id: "b",
      value: -8,
    });

    // O divisor é o detent 0x2000, e não o fim de curso, senão o meio de cada
    // metade marcaria +6 e −2 em vez de +4 e −4.
    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.tempo, 0x20, 0)).toEqual({
      type: "pitch",
      id: "a",
      value: 4,
    });
    expect(send14(ctx, DDJ_STATUS.ccDeckA, DECK_CC_14BIT.tempo, 0x60, 0)).toEqual({
      type: "pitch",
      id: "a",
      value: -4,
    });
  });
});

test.describe("mapa MIDI DDJ-400 — jog", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "mapa puro, um projeto basta");
  });

  test("o gesto encostado decima 26 ticks por nudge, e não dispara por magnitude", () => {
    const ctx = createDdj400MapContext();

    // A DDJ-400 manda delta ±1 sempre, e por isso um limiar de magnitude nunca
    // dispararia. Quem informa velocidade é a taxa, e quem traduz é o divisor.
    const emitted: MixerAction[] = [];
    for (let tick = 0; tick < JOG_TICKS_PER_NUDGE.touched * 2; tick += 1) {
      const action = spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 1);
      if (action) emitted.push(action);
    }

    expect(emitted).toEqual([
      { type: "nudge", id: "a", direction: 1 },
      { type: "nudge", id: "a", direction: 1 },
    ]);
  });

  test("uma volta de 750 ticks encostados rende 28 nudges, que é a faixa inteira", () => {
    const ctx = createDdj400MapContext();

    let nudges = 0;
    for (let tick = 0; tick < 750; tick += 1) {
      if (spin(ctx, DDJ_STATUS.ccDeckB, DECK_CC_JOG.touched, 1)) nudges += 1;
    }

    expect(nudges).toBe(28);
  });

  test("a roda solta pede quatro vezes mais gesto, porque é bend e não arrasto", () => {
    const ctx = createDdj400MapContext();

    let nudges = 0;
    for (let tick = 0; tick < JOG_TICKS_PER_NUDGE.free; tick += 1) {
      if (spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.free, -1)) nudges += 1;
    }

    expect(nudges).toBe(1);
    expect(JOG_TICKS_PER_NUDGE.free).toBe(JOG_TICKS_PER_NUDGE.touched * 4);
  });

  test("o resto do gesto sobrevive, e girar de volta desfaz o acumulado", () => {
    const ctx = createDdj400MapContext();

    for (let tick = 0; tick < 20; tick += 1) {
      expect(spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 1)).toBeNull();
    }
    for (let tick = 0; tick < 20; tick += 1) {
      expect(spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, -1)).toBeNull();
    }

    // Se o acumulador zerasse a cada mensagem, ou se guardasse módulo em vez de
    // sinal, esses quarenta ticks teriam virado nudge em algum ponto.
    expect(spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 1)).toBeNull();
  });

  test("scratch e bend não misturam resto, nem entre decks", () => {
    const ctx = createDdj400MapContext();

    // Vinte e cinco ticks encostados faltam um para o nudge, e vinte e cinco
    // soltos faltam muito mais. Se os dois dividissem acumulador, o quinquagésimo
    // tick emitiria.
    for (let tick = 0; tick < JOG_TICKS_PER_NUDGE.touched - 1; tick += 1) {
      expect(spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 1)).toBeNull();
    }
    for (let tick = 0; tick < JOG_TICKS_PER_NUDGE.touched - 1; tick += 1) {
      expect(spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.free, 1)).toBeNull();
    }
    for (let tick = 0; tick < JOG_TICKS_PER_NUDGE.touched - 1; tick += 1) {
      expect(spin(ctx, DDJ_STATUS.ccDeckB, DECK_CC_JOG.touched, 1)).toBeNull();
    }

    expect(spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 1)).toEqual({
      type: "nudge",
      id: "a",
      direction: 1,
    });
  });

  test("o toque do prato não vira ação, porque o CC da roda já informa o toque", () => {
    const ctx = createDdj400MapContext();

    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.jogTouch, 0x7f), ctx)).toBeNull();
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.jogTouch, 0x00), ctx)).toBeNull();

    // A roda nunca deduz modo, senão encostar no prato atropelaria o VINYL que
    // o DJ escolheu na tela. A DDJ-400 sequer tem essa chave.
    for (let tick = 0; tick < 200; tick += 1) {
      const action = spin(ctx, DDJ_STATUS.ccDeckA, DECK_CC_JOG.touched, 1);
      if (action) expect(action.type).toBe("nudge");
    }
  });

  test("o nudge acumula na fila, ao passo que o pitch guarda o último", () => {
    expect(coalesceMode({ type: "nudge", id: "a", direction: 1 })).toBe("accumulate");
    expect(coalesceMode({ type: "pitch", id: "a", value: 3 })).toBe("continuous");
  });
});

test.describe("fila de coalesce de um frame", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "fila pura, um projeto basta");
  });

  test("knob e fader guardam só o último valor de cada controle", () => {
    const queue = createMidiActionQueue();

    expect(queue.push({ type: "gain", id: "a", value: 0.2 })).toEqual([]);
    expect(queue.push({ type: "gain", id: "a", value: 0.8 })).toEqual([]);
    expect(queue.push({ type: "gain", id: "b", value: 0.3 })).toEqual([]);

    expect(queue.drain()).toEqual([
      { type: "gain", id: "a", value: 0.8 },
      { type: "gain", id: "b", value: 0.3 },
    ]);
    expect(queue.isEmpty()).toBe(true);
  });

  test("EQ não deixa uma banda engolir a outra nem um deck engolir o outro", () => {
    const queue = createMidiActionQueue();

    queue.push({ type: "eq", id: "a", band: "high", value: 3 });
    queue.push({ type: "eq", id: "a", band: "low", value: -6 });
    queue.push({ type: "eq", id: "b", band: "high", value: 9 });
    queue.push({ type: "eq", id: "a", band: "high", value: 4 });

    expect(queue.drain()).toEqual([
      { type: "eq", id: "a", band: "high", value: 4 },
      { type: "eq", id: "a", band: "low", value: -6 },
      { type: "eq", id: "b", band: "high", value: 9 },
    ]);
  });

  test("o jog acumula, porque nudge é passo relativo e não valor absoluto", () => {
    const queue = createMidiActionQueue();

    for (let tick = 0; tick < 3; tick += 1) {
      expect(queue.push({ type: "nudge", id: "a", direction: 1 })).toEqual([]);
    }
    queue.push({ type: "nudge", id: "b", direction: -1 });
    queue.push({ type: "nudge", id: "b", direction: -1 });

    // Se a fila tratasse o jog como knob, três ticks virariam um só e o prato
    // andaria um terço do gesto.
    expect(queue.drain()).toEqual([
      { type: "nudge", id: "a", direction: 1 },
      { type: "nudge", id: "a", direction: 1 },
      { type: "nudge", id: "a", direction: 1 },
      { type: "nudge", id: "b", direction: -1 },
      { type: "nudge", id: "b", direction: -1 },
    ]);
  });

  test("ticks opostos no mesmo frame se cancelam", () => {
    const queue = createMidiActionQueue();

    queue.push({ type: "nudge", id: "a", direction: 1 });
    queue.push({ type: "nudge", id: "a", direction: -1 });

    expect(queue.drain()).toEqual([]);
  });

  test("botão sai na hora e não espera frame", () => {
    const queue = createMidiActionQueue();

    expect(queue.push({ type: "toggle", id: "a" })).toEqual([{ type: "toggle", id: "a" }]);
    expect(queue.push({ type: "cueMonitor", id: "b", value: true })).toEqual([
      { type: "cueMonitor", id: "b", value: true },
    ]);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.drain()).toEqual([]);
  });

  test("o botão leva o pendente consigo, em vez de furar a fila", () => {
    const queue = createMidiActionQueue();

    queue.push({ type: "browseMove", delta: 1 });
    queue.push({ type: "gain", id: "a", value: 0.4 });
    queue.push({ type: "nudge", id: "a", direction: 1 });

    // Este é o bug que a DDJ-400 real expôs: o LOAD saindo antes do passo do
    // encoder carregava a faixa anterior, porque o cursor ainda não tinha
    // andado. A ação imediata é a **última** da lista, e não a primeira.
    expect(queue.push({ type: "browseLoad", id: "a" })).toEqual([
      { type: "gain", id: "a", value: 0.4 },
      { type: "nudge", id: "a", direction: 1 },
      { type: "browseMove", delta: 1 },
      { type: "browseLoad", id: "a" },
    ]);

    // O pendente foi embora com o botão, e por isso o frame não o repete.
    expect(queue.isEmpty()).toBe(true);
    expect(queue.drain()).toEqual([]);
  });

  test("o pad no fim do scratch vê a fase de onde a roda parou", () => {
    const queue = createMidiActionQueue();

    queue.push({ type: "nudge", id: "a", direction: 1 });
    queue.push({ type: "nudge", id: "a", direction: 1 });

    // Mesmo princípio do LOAD, e por isso a onda 5 dependia desta ordem sem
    // que o teste dela percebesse: o helper esperava dois frames antes do pad.
    expect(queue.push({ type: "hotCuePad", id: "a", slot: 2 })).toEqual([
      { type: "nudge", id: "a", direction: 1 },
      { type: "nudge", id: "a", direction: 1 },
      { type: "hotCuePad", id: "a", slot: 2 },
    ]);
  });

  test("a classificação separa as três naturezas de ação", () => {
    expect(coalesceMode({ type: "xf", value: 0.5 })).toBe("continuous");
    expect(coalesceMode({ type: "pitch", id: "a", value: 2 })).toBe("continuous");
    expect(coalesceMode({ type: "nudge", id: "a", direction: 1 })).toBe("accumulate");
    expect(coalesceMode({ type: "toggleLoop", id: "a" })).toBe("immediate");
    expect(coalesceMode({ type: "loadTrack", id: "a", trackId: "x" })).toBe("immediate");
  });
});

test.describe("mapa MIDI DDJ-400 — transporte", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "mapa puro, um projeto basta");
  });

  test("os botões viram ação no press, cada um no seu deck", () => {
    const ctx = createDdj400MapContext();

    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.play, 0x7f), ctx)).toEqual({
      type: "toggle",
      id: "a",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteDeckB, DECK_NOTE.play, 0x7f), ctx)).toEqual({
      type: "toggle",
      id: "b",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.cue, 0x7f), ctx)).toEqual({
      type: "cuePress",
      id: "a",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.cue, 0x00), ctx)).toEqual({
      type: "cueRelease",
      id: "a",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteDeckB, DECK_NOTE.pfl, 0x7f), ctx)).toEqual({
      type: "toggleCueMonitor",
      id: "b",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.sync, 0x7f), ctx)).toEqual({
      type: "toggleSync",
      id: "a",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteDeckB, DECK_NOTE.syncLong, 0x7f), ctx)).toEqual({
      type: "masterDeck",
      id: "b",
    });
  });

  test("soltar o botão não dispara segunda ação", () => {
    const ctx = createDdj400MapContext();

    // A DDJ-400 não manda Note Off de status 0x80, e sim um segundo Note On com
    // velocity zero, e por isso é este caso que faria o play piscar duas vezes.
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.play, 0x00), ctx)).toBeNull();
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.sync, 0x00), ctx)).toBeNull();

    // O Note Off de verdade também não vira ação, porque o parser o classifica
    // como `noteOff` e o mapa só consome `noteOn`.
    expect(mapDdj400({ ...note(0x80, DECK_NOTE.play, 0x7f), kind: "noteOff" }, ctx)).toBeNull();
  });

  test("nem toda note é transporte, e o canal do browser não vaza", () => {
    const ctx = createDdj400MapContext();

    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.shift, 0x7f), ctx)).toBeNull();
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.jogTouch, 0x7f), ctx)).toBeNull();

    // O browser tem canal próprio, e por isso a note 0x0b ali não vira play.
    expect(mapDdj400(note(DDJ_STATUS.noteBrowser, DECK_NOTE.play, 0x7f), ctx)).toBeNull();
  });

  test("os três botões de loop pedem estados distintos, e não o mesmo toggle", () => {
    const ctx = createDdj400MapContext();

    // O engine só tem `toggleLoop`, mas mandar os três para ele faria apertar
    // IN e depois OUT devolver a cabine ao estado inicial.
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.loopIn, 0x7f), ctx)).toEqual({
      type: "loopOn",
      id: "a",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.loopOut, 0x7f), ctx)).toEqual({
      type: "loopOff",
      id: "a",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteDeckB, DECK_NOTE.reloop, 0x7f), ctx)).toEqual({
      type: "toggleLoop",
      id: "b",
    });

    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, DECK_NOTE.loopIn, 0x00), ctx)).toBeNull();
  });

  test("botão não espera frame, ao passo que o fader espera", () => {
    expect(coalesceMode({ type: "toggle", id: "a" })).toBe("immediate");
    expect(coalesceMode({ type: "cuePress", id: "a" })).toBe("immediate");
    expect(coalesceMode({ type: "cueRelease", id: "a" })).toBe("immediate");
    expect(coalesceMode({ type: "toggleSync", id: "a" })).toBe("immediate");
    expect(coalesceMode({ type: "toggleCueMonitor", id: "a" })).toBe("immediate");
    expect(coalesceMode({ type: "masterDeck", id: "a" })).toBe("immediate");
  });
});

/**
 * Imita um `MIDIInput` do Chromium, que é um `EventTarget` e cujo atributo
 * `onmidimessage` dispara **junto** dos listeners, em vez de substituí-los.
 *
 * O detalhe importa porque é exatamente ele que fazia a sessão contar cada
 * mensagem mais de uma vez, e um mock que só honrasse o atributo esconderia o
 * bug em vez de expô-lo.
 */
function createFakeInput() {
  const listeners = new Set<(event: unknown) => void>();

  return {
    onmidimessage: null as null | ((event: unknown) => void),
    open: async () => undefined,
    addEventListener(_type: string, fn: (event: unknown) => void) {
      listeners.add(fn);
    },
    removeEventListener(_type: string, fn: (event: unknown) => void) {
      listeners.delete(fn);
    },
    emit(bytes: number[]) {
      const event = { data: new Uint8Array(bytes), timeStamp: 0 };
      this.onmidimessage?.(event);
      for (const fn of listeners) fn(event);
    },
  };
}

test.describe("porta MIDI", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "sessão pura, um projeto basta");
  });

  test("cada mensagem da porta vira um evento, e não dois", async () => {
    const recebidos: number[][] = [];
    const input = createFakeInput();
    const stop = await listenMidiInput(input as unknown as MIDIInput, (data) => {
      recebidos.push([...data]);
    });

    input.emit([DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, 0x01]);

    // Este é o bug que a DDJ-400 real expôs: um clique de encoder movia o
    // cursor três posições, porque a escuta estava registrada no atributo e no
    // `addEventListener` ao mesmo tempo.
    expect(recebidos).toEqual([[DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, 0x01]]);

    stop();
    input.emit([DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, 0x01]);
    expect(recebidos).toHaveLength(1);
  });
});

test.describe("mapa MIDI DDJ-400 — browser", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "mapa puro, um projeto basta");
  });

  test("o encoder anda um passo para cada lado, em complemento de dois", () => {
    const ctx = createDdj400MapContext();

    // Este é o ponto em que confundir o decodificador custa caro, porque o
    // encoder manda 0x7F para andar um passo atrás, ao passo que `jogDelta`
    // leria o mesmo byte como 63 passos à frente.
    expect(mapDdj400(cc(DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, 0x01), ctx)).toEqual({
      type: "browseMove",
      delta: 1,
    });
    expect(mapDdj400(cc(DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, 0x7f), ctx)).toEqual({
      type: "browseMove",
      delta: -1,
    });
    expect(mapDdj400(cc(DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, 0x03), ctx)).toEqual({
      type: "browseMove",
      delta: 3,
    });
  });

  test("o encoder divide o canal com o crossfader sem se confundir com ele", () => {
    const ctx = createDdj400MapContext();

    // Os dois moram em `0xB6`, e o encoder é resolvido antes da tabela de 14
    // bits, senão o passo relativo entraria na conta de um par MSB/LSB.
    expect(send14(ctx, DDJ_STATUS.ccMixer, MIXER_CC_14BIT.crossfader, 0x7f, 0x7f)).toEqual({
      type: "xf",
      value: 1,
    });
    expect(mapDdj400(cc(DDJ_STATUS.ccMixer, MIXER_CC_BROWSE, 0x01), ctx)).toEqual({
      type: "browseMove",
      delta: 1,
    });
  });

  test("o LOAD resolve o deck pela note, e não pelo canal", () => {
    const ctx = createDdj400MapContext();

    // Única seção do mapa em que o canal não diz o deck, porque as duas notes
    // chegam sob 0x96.
    expect(mapDdj400(note(DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a, 0x7f), ctx)).toEqual({
      type: "browseLoad",
      id: "a",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.b, 0x7f), ctx)).toEqual({
      type: "browseLoad",
      id: "b",
    });
    expect(mapDdj400(note(DDJ_STATUS.noteBrowser, BROWSER_NOTE.back, 0x7f), ctx)).toEqual({
      type: "browseHome",
    });

    expect(mapDdj400(note(DDJ_STATUS.noteBrowser, BROWSER_NOTE.load.a, 0x00), ctx)).toBeNull();
  });

  test("0x47 é LOAD no browser e PLAY+SHIFT no deck, sem colidir", () => {
    const ctx = createDdj400MapContext();

    // O mesmo número em canais diferentes, e por isso o mapa não pode olhar só
    // a note. No canal do deck, 0x47 continua fora do transporte.
    expect(BROWSER_NOTE.load.b).toBe(0x47);
    expect(mapDdj400(note(DDJ_STATUS.noteDeckA, 0x47, 0x7f), ctx)).toBeNull();
  });

  test("o encoder acumula no frame e sai numa ação só, ao contrário do nudge", () => {
    expect(coalesceMode({ type: "browseMove", delta: 1 })).toBe("accumulate");
    expect(coalesceMode({ type: "browseLoad", id: "a" })).toBe("immediate");
    expect(coalesceMode({ type: "browseHome" })).toBe("immediate");

    const queue = createMidiActionQueue();
    expect(queue.isEmpty()).toBe(true);

    for (const delta of [1, 1, 1, -1]) {
      expect(queue.push({ type: "browseMove", delta })).toEqual([]);
    }
    expect(queue.isEmpty()).toBe(false);

    // Duas voltas de encoder num frame viram um salto de dois, e não dois
    // saltos, porque quem aplica já sabe somar e dar a volta na lista.
    expect(queue.drain()).toEqual([{ type: "browseMove", delta: 2 }]);
    expect(queue.isEmpty()).toBe(true);
  });

  test("giro que volta ao ponto de partida não gasta frame", () => {
    const queue = createMidiActionQueue();

    queue.push({ type: "browseMove", delta: 2 });
    queue.push({ type: "browseMove", delta: -2 });

    // A soma zero significa cursor no mesmo lugar, e por isso não há o que
    // pintar nem por que agendar frame.
    expect(queue.isEmpty()).toBe(true);
    expect(queue.drain()).toEqual([]);
  });
});

/**
 * Monta um Note On sintético no canal informado.
 *
 * @param status Primeiro byte da mensagem.
 * @param data1 Número da note.
 * @param data2 Velocity, sendo 0x7F o press e 0x00 o release da DDJ-400.
 */
function note(status: number, data1: number, data2: number): ParsedMidiMessage {
  return { status, channel: status & 0x0f, kind: "noteOn", data1, data2 };
}

/**
 * Monta um CC sintético com o status e os dois data bytes.
 *
 * @param status Primeiro byte da mensagem.
 * @param data1 Número do CC.
 * @param data2 Valor de 0 a 127.
 */
function cc(status: number, data1: number, data2: number): ParsedMidiMessage {
  return { status, channel: status & 0x0f, kind: "cc", data1, data2 };
}

test.describe("mapa MIDI DDJ-400 — pads", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "mapa puro, um projeto basta");
  });

  test("os quatro primeiros pads viram slot, cada um no seu deck", () => {
    const ctx = createDdj400MapContext();

    for (let index = 0; index < HOT_CUE_SLOTS; index += 1) {
      expect(mapDdj400(note(DDJ_STATUS.notePadDeckA, HOT_CUE_FIRST_NOTE + index, 0x7f), ctx)).toEqual({
        type: "hotCuePad",
        id: "a",
        slot: index + 1,
      });
    }

    expect(mapDdj400(note(DDJ_STATUS.notePadDeckB, HOT_CUE_FIRST_NOTE, 0x7f), ctx)).toEqual({
      type: "hotCuePad",
      id: "b",
      slot: 1,
    });
  });

  test("os pads acima do quarto saem nulos, porque a cabine não tem esse slot", () => {
    const ctx = createDdj400MapContext();

    for (let index = HOT_CUE_SLOTS; index < PAD_COUNT; index += 1) {
      expect(mapDdj400(note(DDJ_STATUS.notePadDeckA, HOT_CUE_FIRST_NOTE + index, 0x7f), ctx)).toBeNull();
    }
  });

  test("os outros modos de pad se ignoram sozinhos, sem o mapper guardar estado", () => {
    const ctx = createDdj400MapContext();

    // A controladora resolve o modo no hardware e manda note distinta para cada
    // um, e por isso o pad 1 fora do Hot Cue cai fora da faixa por conta própria.
    for (const outroModo of [0x60, 0x20, 0x30]) {
      expect(mapDdj400(note(DDJ_STATUS.notePadDeckA, outroModo, 0x7f), ctx)).toBeNull();
    }

    // Soltar o pad também não repete a ação.
    expect(mapDdj400(note(DDJ_STATUS.notePadDeckA, HOT_CUE_FIRST_NOTE, 0x00), ctx)).toBeNull();
  });

  test("o canal de pad não empresta significado do canal de transporte", () => {
    const ctx = createDdj400MapContext();

    // A note 0x0b é play no canal do deck, mas no canal dos pads ela está fora
    // da faixa de hot cue e não pode tocar o transporte.
    expect(mapDdj400(note(DDJ_STATUS.notePadDeckA, DECK_NOTE.play, 0x7f), ctx)).toBeNull();
  });
});

/**
 * Manda um tick de jog, que a controladora envia como desvio de `0x40`.
 *
 * @param ctx Contexto mutável do mapper.
 * @param status Canal MIDI do deck.
 * @param jogCc Número do CC do topo ou da borda.
 * @param direction Sentido do tick, que no hardware é sempre ±1.
 */
function spin(
  ctx: ReturnType<typeof createDdj400MapContext>,
  status: number,
  jogCc: number,
  direction: -1 | 1,
): MixerAction | null {
  return mapDdj400(cc(status, jogCc, 0x40 + direction), ctx);
}

/**
 * Envia o par MSB/LSB e devolve a ação do LSB, que fecha os 14 bits.
 *
 * @param ctx Contexto mutável do mapper.
 * @param status Canal MIDI do controle.
 * @param pair Endereço 14-bit do protocolo.
 * @param msb Byte mais significativo.
 * @param lsb Byte menos significativo.
 */
function send14(
  ctx: ReturnType<typeof createDdj400MapContext>,
  status: number,
  pair: { msb: number; lsb: number },
  msb: number,
  lsb: number,
): MixerAction | null {
  mapDdj400(cc(status, pair.msb, msb), ctx);
  return mapDdj400(cc(status, pair.lsb, lsb), ctx);
}
