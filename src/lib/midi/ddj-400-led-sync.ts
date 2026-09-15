/**
 * Espelha o snapshot da cabine nos LEDs da DDJ-400 via MIDI out.
 *
 * Só envia o delta entre o snapshot anterior e o novo, porque o USB satura se
 * cada refresh periódico mandar o mapa inteiro. O pedido passa por
 * `requestLedSync`, que lê o engine logo após o dispatch.
 */

import { engine } from "../audio-engine";
import type { DeckId, MixerSnapshot } from "../../types/mixer";
import { DDJ_STATUS, DECK_NOTE, HOT_CUE_FIRST_NOTE, MIXER_NOTE } from "./ddj-400-protocol";
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
  masterCue: boolean;
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
    masterCue: false,
    hotA: [true, false, false, false, false, false, false, false],
    hotB: [true, false, false, false, false, false, false, false],
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
 * @param options.force True reenvia todos os LEDs, útil ao reconectar a DDJ-400.
 */
export function syncDdj400Leds(snap: MixerSnapshot, options?: { force?: boolean }): void {
  const force = options?.force ?? false;
  const next: LedState = {
    playA: snap.a.playing,
    playB: snap.b.playing,
    syncA: snap.a.sync,
    syncB: snap.b.sync,
    pflA: snap.a.cueMonitor,
    pflB: snap.b.cueMonitor,
    loopA: snap.a.loop.active,
    loopB: snap.b.loop.active,
    masterCue: snap.masterCue,
    hotA: snap.a.hotCues.map((cue) => cue.set),
    hotB: snap.b.hotCues.map((cue) => cue.set),
  };

  const ledChanged = (nextVal: boolean, prevVal: boolean) => force || nextVal !== prevVal;

  if (ledChanged(next.playA, previous.playA)) {
    sendLed(DDJ_STATUS.noteDeckA, DECK_NOTE.play, next.playA);
  }
  if (ledChanged(next.playB, previous.playB)) {
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.play, next.playB);
  }
  if (ledChanged(next.syncA, previous.syncA)) {
    sendLed(DDJ_STATUS.noteDeckA, DECK_NOTE.sync, next.syncA);
  }
  if (ledChanged(next.syncB, previous.syncB)) {
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.sync, next.syncB);
  }
  if (ledChanged(next.pflA, previous.pflA)) {
    sendLed(DDJ_STATUS.noteDeckA, DECK_NOTE.pfl, next.pflA);
  }
  if (ledChanged(next.pflB, previous.pflB)) {
    // Mixxx usa 0x54 no canal B; a lista Pioneer documenta 0x68 para M7-2.
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.pfl, next.pflB);
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.pflDeckB, next.pflB);
  }
  if (ledChanged(next.loopA, previous.loopA)) {
    sendLed(DDJ_STATUS.noteDeckA, DECK_NOTE.reloop, next.loopA);
  }
  if (ledChanged(next.loopB, previous.loopB)) {
    sendLed(DDJ_STATUS.noteDeckB, DECK_NOTE.reloop, next.loopB);
  }
  if (ledChanged(next.masterCue, previous.masterCue)) {
    sendLed(DDJ_STATUS.noteBrowser, MIXER_NOTE.masterCue, next.masterCue);
  }

  syncHotCueLeds("a", next.hotA, previous.hotA, force);
  syncHotCueLeds("b", next.hotB, previous.hotB, force);

  previous = next;
}

/**
 * Envia só os pads de hot cue que mudaram de estado.
 *
 * @param id Deck cujos pads serão atualizados.
 * @param current Estado novo dos oito slots.
 * @param prior Estado anterior dos oito slots.
 */
function syncHotCueLeds(
  id: DeckId,
  current: boolean[],
  prior: boolean[],
  force = false,
): void {
  const status = id === "a" ? DDJ_STATUS.notePadDeckA : DDJ_STATUS.notePadDeckB;
  current.forEach((set, index) => {
    if (!force && set === prior[index]) return;
    sendLed(status, HOT_CUE_FIRST_NOTE + index, set);
  });
}

/**
 * Espelha os LEDs a partir do engine logo após o dispatch.
 *
 * A leitura é síncrona porque o reducer já mutou o engine; adiar para
 * microtask ou layout effect deixava a janela em que outro reattach MIDI
 * fechava a porta de saída antes do Note On chegar à controladora.
 *
 * @param options.force True reenvia todos os LEDs, útil ao reconectar a DDJ-400.
 */
export function requestLedSync(options?: { force?: boolean }): void {
  syncDdj400Leds(engine.snapshot, options);
}

/**
 * Zera o cache interno, útil quando a controladora reconecta.
 */
export function resetDdj400LedCache(): void {
  previous = createLedState();
}
