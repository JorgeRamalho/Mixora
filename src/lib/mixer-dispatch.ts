import type { DeckFileMeta, DeckId, JogMode, MixerAction, MixerSnapshot } from "../types/mixer";
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
  setEqKill(id: DeckId, band: "high" | "mid" | "low", value: boolean): void;
  setCrossfader(value: number): void;
  setMaster(value: number): void;
  setBooth(value: number): void;
  setCueMix(value: number): void;
  setSync(id: DeckId, enabled: boolean): void;
  setMasterDeck(id: DeckId): void;
  setCueMonitor(id: DeckId, enabled: boolean): void;
  setJogMode(id: DeckId, mode: JogMode): void;
  setQuantize(id: DeckId, enabled: boolean): void;
  loadTrack(id: DeckId, trackId: string): void;
  callCue(id: DeckId): void;
  pressCue(id: DeckId): void;
  releaseCue(id: DeckId): void;
  setCueBeat(id: DeckId, beat: number): void;
  setHotCue(id: DeckId, slot: number): void;
  triggerHotCue(id: DeckId, slot: number): void;
  toggle(id: DeckId): Promise<void>;
  toggleLoop(id: DeckId): void;
  nudge(id: DeckId, direction: -1 | 1): void;
  ensure(): Promise<void>;
  loadDeckBuffer(id: DeckId, buffer: AudioBuffer, meta: DeckFileMeta): void;
  loadDeckFile(id: DeckId, file: File): Promise<void>;
  setDeckMeta(id: DeckId, meta: { bpm?: number; key?: string; title?: string }): void;
  setDjOnline(enabled: boolean): void;
};

/**
 * Pedido de UI que o dispatcher não aplica sozinho, porque file picker e
 * modal vivem no React. P4 passa a emitir `openFilePicker`.
 */
export type MixerUiOp =
  | { kind: "openFilePicker"; deckId: DeckId }
  | { kind: "armFilePicker"; deckId: DeckId }
  | { kind: "showLoadError"; message: string };

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
  | { kind: "browse-home"; nextCursor: number }
  | { kind: "absolute"; action: MixerAction }
  | { kind: "engine-toggle"; id: DeckId }
  | { kind: "engine-loop"; id: DeckId }
  | { kind: "engine-cue-press"; id: DeckId }
  | { kind: "engine-cue-release"; id: DeckId }
  | { kind: "engine-nudge"; id: DeckId; direction: -1 | 1 }
  | { kind: "engine-file"; id: DeckId; file: File }
  | { kind: "ui-op"; op: MixerUiOp };

export type MixerDispatchDeps = {
  eng: MixerEngine;
  browse: BrowseState;
  dispatchReducer: (action: MixerAction) => void;
  onUiOp?: (op: MixerUiOp) => void;
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
    case "eqKill":
      eng.setEqKill(action.id, action.band, action.value);
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
    case "loadTrack":
      eng.loadTrack(action.id, action.trackId);
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
    case "setDjOnline":
      eng.setDjOnline(action.value);
      return;
    case "toggle":
    case "toggleSync":
    case "toggleCueMonitor":
    case "cuePress":
    case "cueRelease":
    case "toggleLoop":
    case "loopOn":
    case "loopOff":
    case "hotCuePad":
    case "nudge":
    case "browseMove":
    case "browseHome":
    case "browseLoad":
    case "refresh":
    case "requestDeckLoad":
    case "loadDeckFile":
    case "toggleDjOnline":
      return;
  }
}

/**
 * Resolve uma ação de intenção em um plano, sem mutar o engine.
 *
 * @param eng Engine de onde ler playing, loop e hot cues.
 * @param browse Cursor da biblioteca.
 * @param action Ação crua do mouse ou do MIDI.
 */
export function resolveMixerAction(
  eng: MixerEngine,
  browse: BrowseState,
  action: MixerAction,
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
    case "browseHome":
      return { kind: "browse-home", nextCursor: browse.masterTrackIndex() };
    case "browseLoad":
      return { kind: "ui-op", op: { kind: "armFilePicker", deckId: action.id } };
    case "requestDeckLoad":
      return { kind: "ui-op", op: { kind: "openFilePicker", deckId: action.id } };
    case "loadDeckFile":
      return { kind: "engine-file", id: action.id, file: action.file };
    case "toggleDjOnline":
      return {
        kind: "absolute",
        action: { type: "setDjOnline", value: !eng.snapshot.djOnline },
      };
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
  const plan = resolveMixerAction(deps.eng, deps.browse, action);

  switch (plan.kind) {
    case "noop":
      return { kind: "noop" };
    case "browse-move":
    case "browse-home":
      deps.browse.setCursor(plan.nextCursor);
      return { kind: "ui-only" };
    case "absolute":
      deps.dispatchReducer(plan.action);
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
    case "engine-nudge":
      deps.eng.nudge(plan.id, plan.direction);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-cue-press":
      deps.eng.pressCue(plan.id);
      deps.dispatchReducer({ type: "refresh" });
      return { kind: "refresh" };
    case "engine-cue-release":
      deps.eng.releaseCue(plan.id);
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
 * @param deps Engine, browse e o `dispatch` do `useReducer`.
 */
export function createMixerDispatch(deps: MixerDispatchDeps): MixerDispatch {
  return (action) => {
    dispatchMixerAction(deps, action);
  };
}

/** Callback único da cabine: mouse, MIDI e testes injetam o mesmo union. */
export type MixerDispatch = (action: MixerAction) => void;
