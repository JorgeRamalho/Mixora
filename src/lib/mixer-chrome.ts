import type { MidiLatency } from "./midi/use-midi-controller";
import type { MidiLinkStatus } from "./midi/midi-session";
import type { CueAudioRoutingStatus } from "./cue-audio-routing";
import { DEFAULT_WAVEFORM_ACCENT } from "./waveform-palette";

/** Paleta Camelot espelhada no chrome, para o header e o fundo da rota. */
export interface MixerChromeCamelot {
  a: string;
  b: string;
  live: string;
  playing: boolean;
}

/** Estado de leitura do chrome global do mixer, para o header. */
export interface MixerChromeSnapshot {
  mounted: boolean;
  midi: {
    status: MidiLinkStatus;
    deviceName: string | null;
    ports: string[];
    lastHeard: string | null;
    error: string | null;
    live: boolean;
    latency: MidiLatency | null;
  };
  camelot: MixerChromeCamelot;
  cueAudio: {
    status: CueAudioRoutingStatus;
    deviceLabel: string | null;
    detail: string | null;
    canChooseOutput: boolean;
  };
}

/** Ações que só o `MixerBoard` montado pode executar. */
export interface MixerChromeActions {
  connectMidi: () => void;
  chooseCueOutput: () => void;
  retryCueOutput: () => void;
}

type MixerChromeListener = () => void;

const listeners = new Set<MixerChromeListener>();

const EMPTY_MIDI: MixerChromeSnapshot["midi"] = {
  status: "disconnected",
  deviceName: null,
  ports: [],
  lastHeard: null,
  error: null,
  live: false,
  latency: null,
};

const EMPTY_CAMELOT: MixerChromeCamelot = {
  a: DEFAULT_WAVEFORM_ACCENT,
  b: DEFAULT_WAVEFORM_ACCENT,
  live: DEFAULT_WAVEFORM_ACCENT,
  playing: false,
};

const EMPTY_CUE_AUDIO: MixerChromeSnapshot["cueAudio"] = {
  status: "default",
  deviceLabel: null,
  detail: null,
  canChooseOutput: false,
};

let snapshot: MixerChromeSnapshot = {
  mounted: false,
  midi: { ...EMPTY_MIDI },
  camelot: { ...EMPTY_CAMELOT },
  cueAudio: { ...EMPTY_CUE_AUDIO },
};

let actions: MixerChromeActions | null = null;

/**
 * Snapshot atual do chrome do mixer, para o header.
 */
export function getMixerChromeSnapshot(): MixerChromeSnapshot {
  return snapshot;
}

/**
 * Inscreve componentes de layout nas mudanças do chrome do mixer.
 *
 * @param listener Callback disparado após cada atualização.
 */
export function subscribeMixerChrome(listener: MixerChromeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Mescla um patch no snapshot do chrome e notifica os inscritos.
 *
 * @param patch Campos parciais a atualizar.
 */
export function updateMixerChrome(patch: Partial<MixerChromeSnapshot>): void {
  snapshot = {
    mounted: patch.mounted ?? snapshot.mounted,
    midi: patch.midi ?? snapshot.midi,
    camelot: patch.camelot ?? snapshot.camelot,
    cueAudio: patch.cueAudio ?? snapshot.cueAudio,
  };
  for (const listener of listeners) listener();
}

/**
 * Registra ou remove as ações do `MixerBoard` montado.
 *
 * @param next Ações ativas, ou `null` ao desmontar a cabine.
 */
export function registerMixerChromeActions(next: MixerChromeActions | null): void {
  actions = next;
}

/**
 * Retorna as ações registradas pelo `MixerBoard`, se a rota estiver montada.
 */
export function getMixerChromeActions(): MixerChromeActions | null {
  return actions;
}

/**
 * Zera o chrome ao sair da rota, para o layout não mostrar estado velho.
 */
export function resetMixerChrome(): void {
  snapshot = {
    mounted: false,
    midi: { ...EMPTY_MIDI },
    camelot: { ...EMPTY_CAMELOT },
    cueAudio: { ...EMPTY_CUE_AUDIO },
  };
  actions = null;
  for (const listener of listeners) listener();
}
