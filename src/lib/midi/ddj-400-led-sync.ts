/**
 * Espelha o snapshot da cabine nos LEDs da DDJ-400 via MIDI out.
 *
 * Só envia o delta entre o snapshot anterior e o novo, porque o USB satura se
 * cada refresh de 80 ms mandar o mapa inteiro.
 */

import type { DeckId, MixerSnapshot } from "../../types/mixer";
import { DDJ_STATUS, DECK_NOTE, HOT_CUE_FIRST_NOTE } from "./ddj-400-protocol";
import { sendMidiOutput } from "./midi-session";

const LED_ON = 0x7f;
const LED_OFF = 0x00;

interface LedState {
  playA: boolean;
  playB: boolean;
  syncA: boolean;
  syncB: boolean;
  pflA: boolean;
  pflB: boolean;
  loopA: boolean;
  loopB: boolean;
  hotA: boolean[];
  hotB: boolean[];
}

/**
 * Cria o estado inicial dos LEDs, alinhado ao snapshot de fábrica.
 */
function createLedState(): LedState {
  return {
    playA: false,
    playB: false,
    syncA: false,
    syncB: false,
    pflA: false,
    pflB: false,
    loopA: false,
    loopB: false,
    hotA: [true, false, false, false],
    hotB: [true, false, false, false],
  };
}

let previous = createLedState();

/**
 * Envia Note On com velocity de LED para a controladora.
 *
 * @param status Canal de note do deck.
 * @param note Número da note.
 * @param on True acende e false apaga.
 */
function sendLed(status: number, note: number, on: boolean): void {
  sendMidiOutput([status, note, on ? LED_ON : LED_OFF]);
}

/**
 * Sincroniza os LEDs de transporte e hot cue com o snapshot atual.
 *
 * @param snap Snapshot depois do dispatch.
 */
export function syncDdj400Leds(snap: MixerSnapshot): void {
  const next: LedState = {
    playA: snap.a.playing,
    playB: snap.b.playing,
    syncA: snap.a.sync,
    syncB: snap.b.sync,
    pflA: snap.a.cueMonitor,
    pflB: snap.b.cueMonitor,
    loopA: snap.a.loop.active,
    loopB: snap.b.loop.active,
    hotA: snap.a.hotCues.map((cue) => cue.set),
    hotB: snap.b.hotCues.map((cue) => cue.set),
  };

  if (next.playA !== previous.playA) {
    sendLed(DDJ_STATUS.noteDeckA, DECK_NOTE.play, next.playA);
  }
  if (next.playB !== previous.playB) {
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.play, next.playB);
  }
  if (next.syncA !== previous.syncA) {
    sendLed(DDJ_STATUS.noteDeckA, DECK_NOTE.sync, next.syncA);
  }
  if (next.syncB !== previous.syncB) {
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.sync, next.syncB);
  }
  if (next.pflA !== previous.pflA) {
    sendLed(DDJ_STATUS.noteDeckA, DECK_NOTE.pfl, next.pflA);
  }
  if (next.pflB !== previous.pflB) {
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.pfl, next.pflB);
  }
  if (next.loopA !== previous.loopA) {
    sendLed(DDJ_STATUS.noteDeckA, DECK_NOTE.reloop, next.loopA);
  }
  if (next.loopB !== previous.loopB) {
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.reloop, next.loopB);
  }

  syncHotCueLeds("a", next.hotA, previous.hotA);
  syncHotCueLeds("b", next.hotB, previous.hotB);

  previous = next;
}

/**
 * Envia só os pads de hot cue que mudaram de estado.
 *
 * @param id Deck cujos pads serão atualizados.
 * @param current Estado novo dos quatro slots.
 * @param prior Estado anterior dos quatro slots.
 */
function syncHotCueLeds(id: DeckId, current: boolean[], prior: boolean[]): void {
  const status = id === "a" ? DDJ_STATUS.notePadDeckA : DDJ_STATUS.notePadDeckB;
  current.forEach((set, index) => {
    if (set === prior[index]) return;
    sendLed(status, HOT_CUE_FIRST_NOTE + index, set);
  });
}

/**
 * Zera o cache interno, útil quando a controladora reconecta.
 */
export function resetDdj400LedCache(): void {
  previous = createLedState();
}
