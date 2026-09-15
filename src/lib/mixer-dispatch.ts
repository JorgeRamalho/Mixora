import type {
  BrowseSource,
  DeckFileMeta,
  DeckId,
  JogMode,
  LoopMode,
  MixerAction,
  MixerSnapshot,
} from "../types/mixer";
import type { BrowseState } from "./mixer-browse";
import { phaseToBeat } from "./mixer-snapshot";

/**
 * Superfície mínima do engine que o dispatcher conhece.
 *
 * Não importa React e não importa a classe `MamuteEngine`, e por isso os
 * testes injetam um stub. Ondas futuras podem acrescentar métodos, a saber
 * `loadDeckBuffer`, sem quebrar o espírito desta interface.
 */
export type MixerEngine = {
  snapshot: MixerSnapshot;
  setPitch(id: DeckId, pitch: number): void;
  setGain(id: DeckId, value: number): void;
  setTrim(id: DeckId, value: number): void;
  setFilter(id: DeckId, value: number): void;
  setEq(id: DeckId, band: "high" | "mid" | "low", value: number): void;
  setCrossfader(value: number): void;
  setMaster(value: number): void;
  setBooth(value: number): void;
  setCueMix(value: number): void;
  setMasterCue(enabled: boolean): void;
  setSync(id: DeckId, enabled: boolean): void;
  setMasterDeck(id: DeckId): void;
  setCueMonitor(id: DeckId, enabled: boolean): void;
  setJogMode(id: DeckId, mode: JogMode): void;
  setQuantize(id: DeckId, enabled: boolean): void;
  setSlip(id: DeckId, enabled: boolean): void;
  setKeyLock(id: DeckId, enabled: boolean): void;
  setKeySync(id: DeckId, enabled: boolean): void;
  nudgeKeyShift(id: DeckId, direction: -1 | 1): void;
  setLoopMode(id: DeckId, mode: LoopMode): void;
  pressSlipHotCue(id: DeckId, slot: number): void;
  releaseSlipHotCue(id: DeckId, slot: number): void;
  callCue(id: DeckId): void;
  pressCue(id: DeckId): void;
  releaseCue(id: DeckId): void;
  setCueBeat(id: DeckId, beat: number): void;
  setHotCue(id: DeckId, slot: number): void;
  triggerHotCue(id: DeckId, slot: number): void;
  toggle(id: DeckId): Promise<void>;
  toggleLoop(id: DeckId): void;
  setLoopIn(id: DeckId): void;
  setLoopOut(id: DeckId): void;
  loopHalve(id: DeckId): void;
  loopDouble(id: DeckId): void;
  setBeatLoop(id: DeckId, beats: number): void;
  jumpBeats(id: DeckId, beats: number): void;
  scratchBegin(id: DeckId): void;
  scratchTick(id: DeckId, delta: number): void;
  scratchEnd(id: DeckId): void;
  nudge(id: DeckId, direction: -1 | 1): void;
  ensure(): Promise<void>;
  audioContext(): AudioContext | null;
  loadDeckBuffer(id: DeckId, buffer: AudioBuffer, meta: DeckFileMeta): void;
  loadDeckFile(id: DeckId, file: File): Promise<void>;
  setDeckMeta(id: DeckId, meta: { bpm?: number; key?: string; title?: string }): void;
};

/**
 * Pedido de UI que o dispatcher não aplica sozinho, porque file picker e
 * modal vivem no React. P4 passa a emitir `openFilePicker`.
 */
export type MixerUiOp =
  | { kind: "openFilePicker"; deckId: DeckId }
  | { kind: "armFilePicker"; deckId: DeckId }
  | { kind: "showLoadError"; message: string }
  | { kind: "loadRemoteTrack"; deckId: DeckId; trackId: string };

export type DispatchResult =
  | { kind: "noop" }
  | { kind: "ui-only" }
  | { kind: "applied" }
  | { kind: "refresh" }
  | { kind: "async"; whenDone: Promise<void> };

/**
 * Plano resolvido a partir de uma `MixerAction` de intenção, sem ainda
 * chamar o engine. Os testes leem este union em vez de inspecionar o React.
 */
export type ResolvedPlan =
  | { kind: "noop" }
  | { kind: "browse-move"; nextCursor: number }
  | { kind: "absolute"; action: MixerAction }
  | { kind: "engine-toggle"; id: DeckId }
  | { kind: "engine-loop"; id: DeckId }
  | { kind: "engine-loop-in"; id: DeckId }
  | { kind: "engine-loop-out"; id: DeckId }
  | { kind: "engine-loop-halve"; id: DeckId }
  | { kind: "engine-loop-double"; id: DeckId }
  | { kind: "engine-beat-loop"; id: DeckId; beats: number }
  | { kind: "engine-jump"; id: DeckId; beats: number }
  | { kind: "engine-scratch-begin"; id: DeckId }
  | { kind: "engine-scratch-tick"; id: DeckId; delta: number }
  | { kind: "engine-scratch-end"; id: DeckId }
  | { kind: "engine-cue-press"; id: DeckId }
  | { kind: "engine-cue-release"; id: DeckId }
  | { kind: "engine-slip-hotcue-press"; id: DeckId; slot: number }
  | { kind: "engine-slip-hotcue-release"; id: DeckId; slot: number }
  | { kind: "engine-nudge"; id: DeckId; direction: -1 | 1 }
  | { kind: "engine-file"; id: DeckId; file: File }
  | { kind: "ui-op"; op: MixerUiOp };

export type MixerDispatchDeps = {
  eng: MixerEngine;
  browse: BrowseState;
  dispatchReducer: (action: MixerAction) => void;
  onUiOp?: (op: MixerUiOp) => void;
  getBrowseSource?: () => BrowseSource;
  /**
   * Espelha os LEDs na hora em que o cue já está no snapshot.
   * A cabine passa `() => requestLedSync({ force: true })`, porque o cache de
   * delta perde o primeiro Note On quando a MIDI out ainda está fechando.
   */
  syncLedsOnCue?: () => void;
};

/**
 * Aplica uma ação absoluta no engine. Intenções e browse são no-op aqui,
 * porque o StrictMode do React invocaria o reducer duas vezes e um toggle
 * voltaria ao valor original.
 *
 * @param eng Engine injetável.
 * @param action Ação recebida pelo reducer.
 */
export function applyAbsoluteAction(eng: MixerEngine, action: MixerAction): void {
  switch (action.type) {
    case "pitch":
      eng.setPitch(action.id, action.value);
      return;
    case "gain":
      eng.setGain(action.id, action.value);
      return;
    case "trim":
      eng.setTrim(action.id, action.value);
      return;
    case "filter":
      eng.setFilter(action.id, action.value);
      return;
    case "eq":
      eng.setEq(action.id, action.band, action.value);
      return;
    case "xf":
      eng.setCrossfader(action.value);
      return;
    case "master":
      eng.setMaster(action.value);
      return;
    case "booth":
      eng.setBooth(action.value);
      return;
    case "cueMix":
      eng.setCueMix(action.value);
      return;
    case "masterCue":
      eng.setMasterCue(action.value);
      return;
    case "sync":
      eng.setSync(action.id, action.value);
      return;
    case "masterDeck":
      eng.setMasterDeck(action.id);
      return;
    case "cueMonitor":
      eng.setCueMonitor(action.id, action.value);
      return;
    case "jogMode":
      eng.setJogMode(action.id, action.value);
      return;
    case "quantize":
      eng.setQuantize(action.id, action.value);
      return;
    case "slip":
      eng.setSlip(action.id, action.value);
      return;
    case "keyLock":
      eng.setKeyLock(action.id, action.value);
      return;
    case "keySync":
      eng.setKeySync(action.id, action.value);
      return;
    case "nudgeKeyShift":
      eng.nudgeKeyShift(action.id, action.direction);
      return;
    case "loopMode":
      eng.setLoopMode(action.id, action.value);
      return;
    case "callCue":
      eng.callCue(action.id);
      return;
    case "setCue":
      eng.setCueBeat(action.id, phaseToBeat(eng.snapshot, action.id));
      return;
    case "hotCue":
      eng.setHotCue(action.id, action.slot);
      return;
    case "triggerHotCue":
      eng.triggerHotCue(action.id, action.slot);
      return;
    case "setDeckMeta":
      eng.setDeckMeta(action.id, {
        bpm: action.bpm,
        key: action.key,
        title: action.title,
      });
      return;
    case "toggle":
    case "toggleSync":
    case "toggleCueMonitor":
    case "toggleMasterCue":
    case "toggleSlip":
    case "toggleKeyLock":
    case "toggleKeySync":
    case "loopLengthPress":
    case "hotCuePadPress":
    case "hotCuePadRelease":
    case "cuePress":
    case "cueRelease":
    case "toggleLoop":
    case "loopOn":
    case "loopOff":
    case "setLoopIn":
    case "setLoopOut":
    case "loopHalve":
    case "loopDouble":
    case "setBeatLoop":
    case "jumpBeats":
    case "scratchBegin":
    case "scratchTick":
    case "scratchEnd":
    case "hotCuePad":
    case "nudge":
    case "browseMove":
    case "browseLoad":
    case "refresh":
    case "requestDeckLoad":
    case "loadDeckFile":
    case "loadRemoteTrack":
      return;
  }
}

/**
 * Resolve uma ação de intenção em um plano, sem mutar o engine.
 *
 * @param eng Engine de onde ler playing, loop e hot cues.
 * @param browse Cursor compartilhado da collection.
 * @param action Ação crua do mouse ou do MIDI.
 * @param browseSource Fonte da collection. Sem caller, a cabine usa a API.
 */
export function resolveMixerAction(
  eng: MixerEngine,
  browse: BrowseState,
  action: MixerAction,
  browseSource: BrowseSource = "remote",
): ResolvedPlan {
  switch (action.type) {
    case "toggle":
      return { kind: "engine-toggle", id: action.id };
    case "toggleSync":
      return {
        kind: "absolute",
        action: { type: "sync", id: action.id, value: !eng.snapshot[action.id].sync },
      };
    case "toggleCueMonitor":
      return {
        kind: "absolute",
        action: {
          type: "cueMonitor",
          id: action.id,
          value: !eng.snapshot[action.id].cueMonitor,
        },
      };
    case "toggleMasterCue":
      return {
        kind: "absolute",
        action: { type: "masterCue", value: !eng.snapshot.masterCue },
      };
    case "toggleSlip":
      return {
        kind: "absolute",
        action: { type: "slip", id: action.id, value: !eng.snapshot[action.id].slip },
      };
    case "toggleKeyLock":
      return {
        kind: "absolute",
        action: { type: "keyLock", id: action.id, value: !eng.snapshot[action.id].keyLock },
      };
    case "toggleKeySync":
      return {
        kind: "absolute",
        action: { type: "keySync", id: action.id, value: !eng.snapshot[action.id].keySync },
      };
    case "loopLengthPress": {
      const loop = eng.snapshot[action.id].loop;
      if (loop.mode === "manual") {
        return loop.manualNext === "out"
          ? { kind: "engine-loop-out", id: action.id }
          : { kind: "engine-loop-in", id: action.id };
      }
      return { kind: "engine-beat-loop", id: action.id, beats: loop.beats };
    }
    case "hotCuePadPress":
      if (eng.snapshot[action.id].slip) {
        return { kind: "engine-slip-hotcue-press", id: action.id, slot: action.slot };
      }
      return resolveMixerAction(eng, browse, { type: "hotCuePad", id: action.id, slot: action.slot }, browseSource);
    case "hotCuePadRelease":
      if (eng.snapshot[action.id].slip) {
        return { kind: "engine-slip-hotcue-release", id: action.id, slot: action.slot };
      }
      return { kind: "noop" };
    case "cuePress":
      return { kind: "engine-cue-press", id: action.id };
    case "cueRelease":
      return { kind: "engine-cue-release", id: action.id };
    case "toggleLoop":
      return { kind: "engine-loop", id: action.id };
    case "loopOn":
    case "loopOff":
      if (eng.snapshot[action.id].loop.active === (action.type === "loopOn")) {
        return { kind: "noop" };
      }
      return { kind: "engine-loop", id: action.id };
    case "setLoopIn":
      return { kind: "engine-loop-in", id: action.id };
    case "setLoopOut":
      return { kind: "engine-loop-out", id: action.id };
    case "loopHalve":
      return { kind: "engine-loop-halve", id: action.id };
    case "loopDouble":
      return { kind: "engine-loop-double", id: action.id };
    case "setBeatLoop":
      return { kind: "engine-beat-loop", id: action.id, beats: action.beats };
    case "jumpBeats":
      return { kind: "engine-jump", id: action.id, beats: action.beats };
    case "scratchBegin":
      return { kind: "engine-scratch-begin", id: action.id };
    case "scratchTick":
      return { kind: "engine-scratch-tick", id: action.id, delta: action.delta };
    case "scratchEnd":
      return { kind: "engine-scratch-end", id: action.id };
    case "hotCuePad": {
      const cue = eng.snapshot[action.id].hotCues.find((item) => item.slot === action.slot);
      return {
        kind: "absolute",
        action: {
          type: cue?.set ? "triggerHotCue" : "hotCue",
          id: action.id,
          slot: action.slot,
        },
      };
    }
    case "nudge":
      return { kind: "engine-nudge", id: action.id, direction: action.direction };
    case "browseMove":
      return { kind: "browse-move", nextCursor: browse.getCursor() + action.delta };
    case "browseLoad":
      return resolveLoadPlan(browse, action.id, browseSource, "cursor");
    case "requestDeckLoad":
      return resolveLoadPlan(
        browse,
        action.id,
        action.source === "file" ? "local" : action.source === "library" ? "remote" : browseSource,
        action.source === "file" ? "file" : browseSource === "local" && action.source !== "library"
          ? "file"
          : "cursor",
      );
    case "loadRemoteTrack":
      return { kind: "ui-op", op: { kind: "loadRemoteTrack", deckId: action.id, trackId: action.trackId } };
    case "loadDeckFile":
      return { kind: "engine-file", id: action.id, file: action.file };
    default:
      return { kind: "absolute", action };
  }
}

/**
 * Executa o plano resolvido: browse no estado de tela, absoluto no reducer
 * React, intenção no engine uma única vez.
 *
 * @param deps Dependências injetadas da cabine.
 * @param action Ação crua.
 */
export function dispatchMixerAction(
  deps: MixerDispatchDeps,
  action: MixerAction,
): DispatchResult {
  const plan = resolveMixerAction(
    deps.eng,
    deps.browse,
    action,
    deps.getBrowseSource?.() ?? "remote",
  );

  switch (plan.kind) {
    case "noop":
      return { kind: "noop" };
    case "browse-move":
      deps.browse.setCursor(plan.nextCursor);
      return { kind: "ui-only" };
    case "absolute":
      deps.dispatchReducer(plan.action);
      if (isCueSnapshotPlan(plan)) syncCueLeds(deps);
      return { kind: "applied" };
    case "engine-toggle": {
      const whenDone = deps.eng.toggle(plan.id).then(() => {
        deps.dispatchReducer({ type: "refresh" });
      });
      return { kind: "async", whenDone };
    }
    case "engine-loop":
      deps.eng.toggleLoop(plan.id);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-loop-in":
      deps.eng.setLoopIn(plan.id);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-loop-out":
      deps.eng.setLoopOut(plan.id);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-loop-halve":
      deps.eng.loopHalve(plan.id);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-loop-double":
      deps.eng.loopDouble(plan.id);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-beat-loop":
      deps.eng.setBeatLoop(plan.id, plan.beats);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-jump":
      deps.eng.jumpBeats(plan.id, plan.beats);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-scratch-begin":
      deps.eng.scratchBegin(plan.id);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-scratch-tick":
      deps.eng.scratchTick(plan.id, plan.delta);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-scratch-end":
      deps.eng.scratchEnd(plan.id);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-nudge":
      deps.eng.nudge(plan.id, plan.direction);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-cue-press":
      deps.eng.pressCue(plan.id);
      syncCueLeds(deps);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-cue-release":
      deps.eng.releaseCue(plan.id);
      syncCueLeds(deps);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-slip-hotcue-press":
      deps.eng.pressSlipHotCue(plan.id, plan.slot);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-slip-hotcue-release":
      deps.eng.releaseSlipHotCue(plan.id, plan.slot);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "ui-op":
      deps.onUiOp?.(plan.op);
      return { kind: "ui-only" };
    case "engine-file": {
      const whenDone = deps.eng.loadDeckFile(plan.id, plan.file).then(
        () => {
          deps.dispatchReducer({ type: "refresh" });
        },
        (error: unknown) => {
          const message = error instanceof Error ? error.message : "Falha ao carregar o arquivo";
          deps.onUiOp?.({ kind: "showLoadError", message });
        },
      );
      return { kind: "async", whenDone };
    }
  }
}

/**
 * Liga o dispatcher à cabine. O retorno é o callback único de mouse e MIDI.
 *
 * @param deps Engine, browse, o `dispatch` do `useReducer` e o espelho de LED
 * do cue, que a cabine liga em `requestLedSync`.
 */
export function createMixerDispatch(deps: MixerDispatchDeps): MixerDispatch {
  return (action) => {
    dispatchMixerAction(deps, action);
  };
}

/**
 * Diz se o plano absoluto já gravou um cue no snapshot e pode espelhar LEDs.
 *
 * @param plan Plano resolvido do dispatcher.
 */
function isCueSnapshotPlan(plan: ResolvedPlan): boolean {
  if (plan.kind !== "absolute") return false;
  switch (plan.action.type) {
    case "cueMonitor":
    case "masterCue":
    case "callCue":
    case "setCue":
      return true;
    default:
      return false;
  }
}

/**
 * Dispara o espelho de LED na hora do cue, sem esperar o refresh do React.
 *
 * @param deps Dispatcher da cabine, com o callback opcional de MIDI out.
 */
function syncCueLeds(deps: MixerDispatchDeps): void {
  deps.syncLedsOnCue?.();
}

/**
 * MIDI LOAD e o botão da tela resolvem o cursor da API. `source: file` abre o picker.
 *
 * @param browse Estado do encoder da collection.
 * @param deckId Deck destino.
 * @param source Fonte ativa, já resolvida pelo caller.
 * @param intent `cursor` carrega a faixa da lista; `file` abre o diálogo local.
 */
function resolveLoadPlan(
  browse: BrowseState,
  deckId: DeckId,
  source: BrowseSource,
  intent: "cursor" | "file",
): ResolvedPlan {
  if (intent === "file") {
    return { kind: "ui-op", op: { kind: "openFilePicker", deckId } };
  }
  const trackId = browse.resolveTrackId(browse.getCursor());
  if (!trackId) return { kind: "noop" };
  return { kind: "ui-op", op: { kind: "loadRemoteTrack", deckId, trackId } };
}

/** Callback único da cabine: mouse, MIDI e testes injetam o mesmo union. */
export type MixerDispatch = (action: MixerAction) => void;
