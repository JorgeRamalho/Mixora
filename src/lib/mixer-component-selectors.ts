import { engine } from "./audio-engine";
import {
  formatShiftedCamelotCode,
  formatShiftedKeyLabel,
  formatShiftedMusicalKeyLabel,
  getCamelotKey,
  harmonicDistance,
} from "./musical-key";
import type {
  DeckEq,
  DeckId,
  DeckLoop,
  DeckState,
  HotCue,
  MixerSnapshot,
  DeckTrack,
  WaveformV10Bands,
} from "../types/mixer";

/** Props de waveform master para um deck. */
export type MasterWaveDeckView = {
  spinning: boolean;
  peaks: Float32Array | null;
  waveformV10: WaveformV10Bands | null;
  accentColor: string;
  camelotKey: string | null;
};

/** Visão React do CDJ para um deck, sem campos voláteis de transporte. */
export type CdjDeckView = {
  playing: boolean;
  bpm: number;
  effectiveBpm: string;
  pitch: number;
  eq: DeckEq;
  sync: boolean;
  keyLock: boolean;
  keySync: boolean;
  keyShift: number;
  slip: boolean;
  quantize: boolean;
  jogMode: DeckState["jogMode"];
  loop: DeckLoop;
  hotCues: readonly HotCue[];
  sourceKind: DeckState["sourceKind"];
  cueBeat: number;
  durationSec: number;
  peaks: Float32Array | null;
  waveformV10: WaveformV10Bands | null;
  track: DeckTrack;
  isMaster: boolean;
  harmony: string;
  camelotColor: string;
  keyLabel: string;
  camelotLabel: string;
  musicalKeyLabel: string;
};

/**
 * Projeta o deck para o lane master de waveforms.
 *
 * @param snapshot Snapshot vivo do engine.
 * @param id Deck consultado.
 */
export function selectMasterWaveDeckView(snapshot: MixerSnapshot, id: DeckId): MasterWaveDeckView {
  const deck = snapshot[id];
  return {
    spinning: deck.playing,
    peaks: deck.peaks,
    waveformV10: deck.waveformV10,
    accentColor: getCamelotKey(deck.track.key)?.color ?? "#8b8fa8",
    camelotKey: deck.track.key,
  };
}

/**
 * Projeta o estado React de um CDJ, omitindo relógio e fase que o espelho DOM atualiza.
 *
 * @param snapshot Snapshot vivo do engine.
 * @param id Deck consultado.
 * @param masterKey Tom do deck mestre para harmonia e KEY SYNC.
 */
export function selectCdjDeckView(
  snapshot: MixerSnapshot,
  id: DeckId,
  masterKey: string,
): CdjDeckView {
  const deck = snapshot[id];
  const keyLabel = formatShiftedKeyLabel(deck.track.key, deck.keyShift);
  const camelotLabel = formatShiftedCamelotCode(deck.track.key, deck.keyShift);
  const musicalKeyLabel = formatShiftedMusicalKeyLabel(deck.track.key, deck.keyShift);
  return {
    playing: deck.playing,
    bpm: deck.bpm,
    effectiveBpm: engine.effectiveBpm(id).toFixed(2),
    pitch: deck.pitch,
    eq: deck.eq,
    sync: deck.sync,
    keyLock: deck.keyLock,
    keySync: deck.keySync,
    keyShift: deck.keyShift,
    slip: deck.slip,
    quantize: deck.quantize,
    jogMode: deck.jogMode,
    loop: deck.loop,
    hotCues: deck.hotCues,
    sourceKind: deck.sourceKind,
    cueBeat: deck.cueBeat,
    durationSec: deck.durationSec,
    peaks: deck.peaks,
    waveformV10: deck.waveformV10,
    track: deck.track,
    isMaster: snapshot.masterDeck === id,
    harmony: harmonicDistance(masterKey, deck.track.key),
    camelotColor: getCamelotKey(deck.track.key)?.color ?? "#8b8fa8",
    keyLabel,
    camelotLabel,
    musicalKeyLabel,
  };
}

/**
 * Compara duas visões master de waveform por identidade dos campos estáveis.
 *
 * @param previous Visão anterior.
 * @param next Visão nova.
 */
export function masterWaveDeckViewEqual(previous: MasterWaveDeckView, next: MasterWaveDeckView): boolean {
  return (
    previous.spinning === next.spinning &&
    previous.peaks === next.peaks &&
    previous.waveformV10 === next.waveformV10 &&
    previous.accentColor === next.accentColor &&
    previous.camelotKey === next.camelotKey
  );
}

/**
 * Compara duas visões de CDJ ignorando referências estáveis de transporte.
 *
 * @param previous Visão anterior.
 * @param next Visão nova.
 */
export function cdjDeckViewEqual(previous: CdjDeckView, next: CdjDeckView): boolean {
  return (
    previous.playing === next.playing &&
    previous.bpm === next.bpm &&
    previous.effectiveBpm === next.effectiveBpm &&
    previous.pitch === next.pitch &&
    previous.eq.high === next.eq.high &&
    previous.eq.mid === next.eq.mid &&
    previous.eq.low === next.eq.low &&
    previous.sync === next.sync &&
    previous.keyLock === next.keyLock &&
    previous.keySync === next.keySync &&
    previous.keyShift === next.keyShift &&
    previous.slip === next.slip &&
    previous.quantize === next.quantize &&
    previous.jogMode === next.jogMode &&
    deckLoopEqual(previous.loop, next.loop) &&
    hotCuesEqual(previous.hotCues, next.hotCues) &&
    previous.sourceKind === next.sourceKind &&
    previous.cueBeat === next.cueBeat &&
    previous.durationSec === next.durationSec &&
    previous.peaks === next.peaks &&
    previous.waveformV10 === next.waveformV10 &&
    deckTrackEqual(previous.track, next.track) &&
    previous.isMaster === next.isMaster &&
    previous.harmony === next.harmony &&
    previous.camelotColor === next.camelotColor &&
    previous.keyLabel === next.keyLabel &&
    previous.camelotLabel === next.camelotLabel &&
    previous.musicalKeyLabel === next.musicalKeyLabel
  );
}

/**
 * Compara loops por valor.
 *
 * @param previous Loop anterior.
 * @param next Loop novo.
 */
function deckLoopEqual(previous: DeckLoop, next: DeckLoop): boolean {
  return (
    previous.active === next.active &&
    previous.inBeat === next.inBeat &&
    previous.outBeat === next.outBeat &&
    previous.mode === next.mode &&
    previous.beats === next.beats &&
    previous.manualNext === next.manualNext
  );
}

/**
 * Compara hot cues por slot e estado.
 *
 * @param previous Lista anterior.
 * @param next Lista nova.
 */
function hotCuesEqual(previous: readonly HotCue[], next: readonly HotCue[]): boolean {
  if (previous.length !== next.length) return false;
  for (let index = 0; index < previous.length; index += 1) {
    const left = previous[index];
    const right = next[index];
    if (!left || !right) return false;
    if (left.slot !== right.slot || left.set !== right.set || left.beat !== right.beat) {
      return false;
    }
  }
  return true;
}

/**
 * Compara metadados de faixa usados na UI do deck.
 *
 * @param previous Faixa anterior.
 * @param next Faixa nova.
 */
function deckTrackEqual(previous: DeckTrack, next: DeckTrack): boolean {
  return (
    previous.id === next.id &&
    previous.title === next.title &&
    previous.artist === next.artist &&
    previous.key === next.key
  );
}
