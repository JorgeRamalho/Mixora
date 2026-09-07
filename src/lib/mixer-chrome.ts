import type { BrowseChipTrack } from "../components/mixer/BrowseChip";
import type { MidiLatency } from "./midi/use-midi-controller";
import type { MidiLinkStatus } from "./midi/midi-session";
import type { BrowseSource, DeckId } from "../types/mixer";

/** Estado de leitura do chrome global do mixer, para header e status bar. */
export interface MixerChromeSnapshot {
  mounted: boolean;
  browseSource: BrowseSource;
  browseTrack: BrowseChipTrack | null;
  browsePosition: number;
  browseTotal: number;
  browseLoading: boolean;
  activeDeck: DeckId;
  pendingLoad: DeckId | null;
  libraryError: boolean;
  cabinetHeadHidden: boolean;
  midi: {
    status: MidiLinkStatus;
    deviceName: string | null;
    ports: string[];
    lastHeard: string | null;
    error: string | null;
    live: boolean;
    latency: MidiLatency | null;
  };
}

/** Ações que só o `MixerBoard` montado pode executar. */
export interface MixerChromeActions {
  changeBrowseSource: (source: BrowseSource) => void;
  connectMidi: () => void;
  toggleCabinetHead: () => void;
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

let snapshot: MixerChromeSnapshot = {
  mounted: false,
  browseSource: "local",
  browseTrack: null,
  browsePosition: 1,
  browseTotal: 0,
  browseLoading: false,
  activeDeck: "a",
  pendingLoad: null,
  libraryError: false,
  cabinetHeadHidden: false,
  midi: { ...EMPTY_MIDI },
};

let actions: MixerChromeActions | null = null;

/**
 * Snapshot atual do chrome do mixer, para o header e a status bar.
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
    browseSource: patch.browseSource ?? snapshot.browseSource,
    browseTrack: patch.browseTrack !== undefined ? patch.browseTrack : snapshot.browseTrack,
    browsePosition: patch.browsePosition ?? snapshot.browsePosition,
    browseTotal: patch.browseTotal ?? snapshot.browseTotal,
    browseLoading: patch.browseLoading ?? snapshot.browseLoading,
    activeDeck: patch.activeDeck ?? snapshot.activeDeck,
    pendingLoad: patch.pendingLoad !== undefined ? patch.pendingLoad : snapshot.pendingLoad,
    libraryError: patch.libraryError ?? snapshot.libraryError,
    cabinetHeadHidden: patch.cabinetHeadHidden ?? snapshot.cabinetHeadHidden,
    midi: patch.midi ?? snapshot.midi,
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
    browseSource: "local",
    browseTrack: null,
    browsePosition: 1,
    browseTotal: 0,
    browseLoading: false,
    activeDeck: "a",
    pendingLoad: null,
    libraryError: false,
    cabinetHeadHidden: false,
    midi: { ...EMPTY_MIDI },
  };
  actions = null;
  for (const listener of listeners) listener();
}
