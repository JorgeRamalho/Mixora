export type DeckId = "a" | "b";

export type JogMode = "vinyl" | "cdj";

export interface TrainingTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  key: string;
  scale: string;
  duration: string;
  grid: string;
}

export interface HotCue {
  slot: number;
  beat: number;
  set: boolean;
}

/**
 * Slots de hot cue por deck.
 *
 * Mora aqui, e não no engine, porque o mapper MIDI precisa do mesmo número para
 * descartar os pads que a cabine não tem, e importar o `audio-engine` dentro do
 * mapa puro arrastaria a Web Audio para um módulo que roda sem página.
 */
export const HOT_CUE_SLOTS = 4;

export interface DeckEq {
  high: number;
  mid: number;
  low: number;
}

export interface DeckEqKill {
  high: boolean;
  mid: boolean;
  low: boolean;
}

export interface DeckLoop {
  active: boolean;
  inBeat: number | null;
  outBeat: number | null;
}

export interface DeckState {
  playing: boolean;
  bpm: number;
  pitch: number;
  gain: number;
  trim: number;
  eq: DeckEq;
  eqKill: DeckEqKill;
  filter: number;
  sync: boolean;
  masterTempo: boolean;
  cueMonitor: boolean;
  jogMode: JogMode;
  quantize: boolean;
  loop: DeckLoop;
  hotCues: HotCue[];
  cueBeat: number;
  track: TrainingTrack;
  phase: number;
  /** `synthetic` é o loop de treino; `file` é buffer decodificado. */
  sourceKind: "synthetic" | "file";
  durationSec: number;
  positionSec: number;
  peaks: Float32Array | null;
}

/** Metadados de um arquivo carregado no deck. */
export interface DeckFileMeta {
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  durationSec: number;
}

export interface MixerSnapshot {
  a: DeckState;
  b: DeckState;
  crossfader: number;
  master: number;
  booth: number;
  cueMix: number;
  masterDeck: DeckId;
  /** IA Camelot liga MASTER/SYNC na passagem entre as tracks. */
  djOnline: boolean;
}

/**
 * Ação única da cabine. Mouse, knobs da tela e a DDJ-400 emitem o mesmo union,
 * porque `createMixerDispatch` em `src/lib/mixer-dispatch.ts` é o único caminho
 * até o audio-engine.
 *
 * Duas famílias convivem aqui. As ações com `value` são **absolutas** e servem
 * a quem já conhece o estado de destino, como um slider da tela. As ações sem
 * `value`, a saber `toggle`, `toggleSync`, `toggleCueMonitor`, `toggleLoop`,
 * `cuePress` e `cueRelease`, são de **intenção**: elas descrevem o gesto e deixam o
 * dispatcher ler o snapshot, porque um botão MIDI manda press e nada mais.
 *
 * As três ações de browser são intenção por um motivo diferente dos toggles.
 * Elas não dependem do snapshot: `browseMove` e `browseHome` mexem no cursor da
 * biblioteca, e `browseLoad` abre o seletor de arquivo do deck indicado.
 *
 * Union aberto: um `type` novo exige case em `applyAbsoluteAction` ou
 * `resolveMixerAction`, e uma linha em `MIXER_ACTION_ROUTES` (ver
 * `src/lib/mixer-action-routing.ts`).
 */
export type MixerAction =
  | { type: "refresh" }
  | { type: "toggle"; id: DeckId }
  | { type: "pitch"; id: DeckId; value: number }
  | { type: "gain"; id: DeckId; value: number }
  | { type: "trim"; id: DeckId; value: number }
  | { type: "filter"; id: DeckId; value: number }
  | { type: "eq"; id: DeckId; band: "high" | "mid" | "low"; value: number }
  | { type: "eqKill"; id: DeckId; band: "high" | "mid" | "low"; value: boolean }
  | { type: "xf"; value: number }
  | { type: "master"; value: number }
  | { type: "booth"; value: number }
  | { type: "cueMix"; value: number }
  | { type: "sync"; id: DeckId; value: boolean }
  | { type: "toggleSync"; id: DeckId }
  | { type: "masterDeck"; id: DeckId }
  | { type: "cueMonitor"; id: DeckId; value: boolean }
  | { type: "toggleCueMonitor"; id: DeckId }
  | { type: "jogMode"; id: DeckId; value: JogMode }
  | { type: "quantize"; id: DeckId; value: boolean }
  | { type: "loadTrack"; id: DeckId; trackId: string }
  | { type: "callCue"; id: DeckId }
  | { type: "setCue"; id: DeckId }
  | { type: "cuePress"; id: DeckId }
  | { type: "cueRelease"; id: DeckId }
  | { type: "toggleLoop"; id: DeckId }
  | { type: "loopOn"; id: DeckId }
  | { type: "loopOff"; id: DeckId }
  | { type: "hotCue"; id: DeckId; slot: number }
  | { type: "triggerHotCue"; id: DeckId; slot: number }
  | { type: "hotCuePad"; id: DeckId; slot: number }
  | { type: "nudge"; id: DeckId; direction: -1 | 1 }
  | { type: "browseMove"; delta: number }
  | { type: "browseLoad"; id: DeckId }
  | { type: "browseHome" }
  | { type: "requestDeckLoad"; id: DeckId; source?: "file" | "library" }
  | { type: "loadDeckFile"; id: DeckId; file: File }
  | { type: "setDeckMeta"; id: DeckId; bpm?: number; key?: string; title?: string }
  | { type: "toggleDjOnline" }
  | { type: "setDjOnline"; value: boolean };
