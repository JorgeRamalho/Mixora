export type DeckId = "a" | "b";

export type JogMode = "vinyl" | "cdj";

/** Auto loop de N beats versus IN/OUT manual, como AU/MA no Rekordbox. */
export type LoopMode = "auto" | "manual";

/** Próximo gesto do loop manual: grava IN e depois OUT. */
export type LoopManualNext = "in" | "out";

/** Tamanhos do auto loop, em beats. */
export const LOOP_BEAT_STEPS = [1, 2, 4, 8, 16, 32] as const;

/** Limites do ajuste de tom do KEY SYNC, em semitons. */
export const KEY_SHIFT_MIN = -6;
export const KEY_SHIFT_MAX = 6;

/** Envelopes espectrais V10 para waveform colorida tipo Rekordbox. */
export interface WaveformV10Bands {
  bass: Float32Array;
  mids: Float32Array;
  highs: Float32Array;
}

/**
 * Grid de batida reconstruído da análise V10.
 * O backend não manda um array de tempos, e sim BPM refinado, duração do
 * compasso e cues com `bar`+`sec`, de onde sai o offset do primeiro downbeat.
 */
export interface BeatGrid {
  /** BPM da análise, em geral `bpm_refined`. */
  bpm: number;
  /** Tempo do beat 0 no arquivo, em segundos. */
  offsetSec: number;
  /** Batidas por compasso, 4 no 4/4. */
  beatsPerBar: number;
  /** Compassos por frase musical, em geral `phrase_bars`. */
  phraseBars: number;
}

/** Fonte da lista do encoder BROWSE. A cabine usa `remote`; `local` só no picker de arquivo. */
export type BrowseSource = "local" | "remote";

/** Recorte da collection remota: biblioteca local indexada ou catálogo Beatport. */
export type RemoteCollectionMode = "library" | "catalog";

/** Item leve usado na collection e no encoder BROWSE. */
export interface BrowseTrackItem {
  id: string;
  title: string;
  artist: string;
  /** Mix, EP ou álbum quando a API expõe `mix_name`. */
  albumOrMix: string | null;
  genre: string | null;
  bpm: number | null;
  /** Código Camelot para filtro e KEY SYNC. */
  key: string | null;
  /** Tom musical bruto da API, por exemplo `Gm`. */
  musicalKey: string | null;
  label: string | null;
  durationMs: number | null;
  /** Preview compacto da waveform V8. */
  waveformPreview: readonly number[] | null;
}

/** Metadados de faixa exibidos no deck, vindos da API ou de upload local. */
export interface DeckTrack {
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
export const HOT_CUE_SLOTS = 8;

export interface DeckEq {
  high: number;
  mid: number;
  low: number;
}

export interface DeckLoop {
  active: boolean;
  inBeat: number | null;
  outBeat: number | null;
  mode: LoopMode;
  beats: number;
  manualNext: LoopManualNext;
}

/**
 * Loop inicial de um deck: auto de 4 beats, desligado.
 */
export function createDeckLoop(): DeckLoop {
  return {
    active: false,
    inBeat: null,
    outBeat: null,
    mode: "auto",
    beats: 4,
    manualNext: "in",
  };
}

export interface DeckState {
  playing: boolean;
  bpm: number;
  pitch: number;
  gain: number;
  trim: number;
  eq: DeckEq;
  filter: number;
  sync: boolean;
  /** Trava o rótulo de tom no MT; neste corte não faz time-stretch. */
  keyLock: boolean;
  /** KEY SYNC ligado, com `keyShift` calculado contra o deck MASTER. */
  keySync: boolean;
  /** Semitons aplicados no rótulo e, se o beat sync estiver off, no rate. */
  keyShift: number;
  /** SLIP: scratch, loop e hot cue momentâneo voltam à posição fantasma. */
  slip: boolean;
  cueMonitor: boolean;
  jogMode: JogMode;
  quantize: boolean;
  loop: DeckLoop;
  hotCues: HotCue[];
  cueBeat: number;
  track: DeckTrack;
  phase: number;
  /** `synthetic` é o loop de treino; `file` é buffer decodificado. */
  sourceKind: "synthetic" | "file";
  durationSec: number;
  positionSec: number;
  peaks: Float32Array | null;
  /** Bandas bass/mids/highs da análise V10, quando disponível. */
  waveformV10: WaveformV10Bands | null;
  /** Grid de batida da análise; null no loop sintético ou arquivo sem análise. */
  beatGrid: BeatGrid | null;
}

/** Metadados de um arquivo carregado no deck. */
export interface DeckFileMeta {
  title: string;
  artist?: string;
  bpm?: number;
  key?: string;
  durationSec: number;
  /** Picos V8 do backend; se ausente, o engine calcula do buffer. */
  peaks?: Float32Array | null;
  /** Bandas V10 para waveform colorida; se ausente, usa picos mono. */
  waveformV10?: WaveformV10Bands | null;
  /** Grid de batida da análise remota, quando o MusicDiscover devolveu BPM e cues. */
  beatGrid?: BeatGrid | null;
}

export interface MixerSnapshot {
  a: DeckState;
  b: DeckState;
  crossfader: number;
  master: number;
  booth: number;
  cueMix: number;
  /** Roteia o master para o fone, como o botão MASTER CUE da Pioneer. */
  masterCue: boolean;
  masterDeck: DeckId;
}

/**
 * Ação única da cabine. Mouse, knobs da tela e a DDJ-400 emitem o mesmo union,
 * porque `createMixerDispatch` em `src/lib/mixer-dispatch.ts` é o único caminho
 * até o audio-engine.
 *
 * Duas famílias convivem aqui. As ações com `value` são **absolutas** e servem
 * a quem já conhece o estado de destino, como um slider da tela. As ações sem
 * `value`, a saber `toggle`, `toggleSync`, `toggleCueMonitor`, `toggleLoop`,
 * `cuePress`, `cueRelease`, `toggleSlip`, `toggleKeyLock` e `toggleKeySync`, são de **intenção**: elas descrevem o gesto e deixam o
 * dispatcher ler o snapshot, porque um botão MIDI manda press e nada mais.
 *
 * As ações de browser são intenção por um motivo diferente dos toggles.
 * Elas não dependem do snapshot: `browseMove` mexe no cursor da collection
 * compartilhada, e `browseLoad` carrega a faixa do cursor no deck do botão MIDI.
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
  | { type: "xf"; value: number }
  | { type: "master"; value: number }
  | { type: "booth"; value: number }
  | { type: "cueMix"; value: number }
  | { type: "masterCue"; value: boolean }
  | { type: "toggleMasterCue" }
  | { type: "sync"; id: DeckId; value: boolean }
  | { type: "toggleSync"; id: DeckId }
  | { type: "masterDeck"; id: DeckId }
  | { type: "cueMonitor"; id: DeckId; value: boolean }
  | { type: "toggleCueMonitor"; id: DeckId }
  | { type: "jogMode"; id: DeckId; value: JogMode }
  | { type: "quantize"; id: DeckId; value: boolean }
  | { type: "slip"; id: DeckId; value: boolean }
  | { type: "toggleSlip"; id: DeckId }
  | { type: "keyLock"; id: DeckId; value: boolean }
  | { type: "toggleKeyLock"; id: DeckId }
  | { type: "keySync"; id: DeckId; value: boolean }
  | { type: "toggleKeySync"; id: DeckId }
  | { type: "nudgeKeyShift"; id: DeckId; direction: -1 | 1 }
  | { type: "loopMode"; id: DeckId; value: LoopMode }
  | { type: "loopLengthPress"; id: DeckId }
  | { type: "hotCuePadPress"; id: DeckId; slot: number }
  | { type: "hotCuePadRelease"; id: DeckId; slot: number }
  | { type: "callCue"; id: DeckId }
  | { type: "setCue"; id: DeckId }
  | { type: "cuePress"; id: DeckId }
  | { type: "cueRelease"; id: DeckId }
  | { type: "toggleLoop"; id: DeckId }
  | { type: "loopOn"; id: DeckId }
  | { type: "loopOff"; id: DeckId }
  | { type: "setLoopIn"; id: DeckId }
  | { type: "setLoopOut"; id: DeckId }
  | { type: "loopHalve"; id: DeckId }
  | { type: "loopDouble"; id: DeckId }
  | { type: "setBeatLoop"; id: DeckId; beats: number }
  | { type: "jumpBeats"; id: DeckId; beats: number }
  | { type: "scratchBegin"; id: DeckId }
  | { type: "scratchTick"; id: DeckId; delta: number }
  | { type: "scratchEnd"; id: DeckId }
  | { type: "hotCue"; id: DeckId; slot: number }
  | { type: "triggerHotCue"; id: DeckId; slot: number }
  | { type: "hotCuePad"; id: DeckId; slot: number }
  | { type: "nudge"; id: DeckId; direction: -1 | 1 }
  | { type: "browseMove"; delta: number }
  | { type: "browseLoad"; id: DeckId }
  | { type: "requestDeckLoad"; id: DeckId; source?: "file" | "library" }
  | { type: "loadDeckFile"; id: DeckId; file: File }
  | { type: "loadRemoteTrack"; id: DeckId; trackId: string }
  | { type: "setDeckMeta"; id: DeckId; bpm?: number; key?: string; title?: string };
