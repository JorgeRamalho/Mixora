import { expect, test } from "@playwright/test";
import { createBrowseState, wrapCursor } from "../../src/lib/mixer-browse";
import {
  applyAbsoluteAction,
  createMixerDispatch,
  dispatchMixerAction,
  resolveMixerAction,
  type MixerEngine,
} from "../../src/lib/mixer-dispatch";
import { cloneMixerSnapshot, phaseToBeat } from "../../src/lib/mixer-snapshot";
import type { DeckId, DeckState, MixerAction, MixerSnapshot, DeckTrack } from "../../src/types/mixer";
import { BROWSE_FIXTURE_TRACKS } from "../helpers/deck-track-fixtures";
import { EMPTY_DECK_TRACK } from "../../src/lib/deck-track";

test.describe("dispatcher do mixer — intenção e browse", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "dispatcher puro, um projeto basta");
  });

  test("wrapCursor dá a volta nas pontas da lista", () => {
    const total = BROWSE_FIXTURE_TRACKS.length;
    expect(total).toBeGreaterThan(1);
    expect(wrapCursor(0, total)).toBe(0);
    expect(wrapCursor(total - 1, total)).toBe(total - 1);
    expect(wrapCursor(total, total)).toBe(0);
    expect(wrapCursor(-1, total)).toBe(total - 1);
    expect(wrapCursor(total + 2, total)).toBe(2);
  });

  test("cuePress e cueRelease vão direto ao engine", () => {
    const { eng } = createFakeEngine();
    const idle = createIdleBrowse();

    expect(resolveMixerAction(eng, idle.browse, { type: "cuePress", id: "a" })).toEqual({
      kind: "engine-cue-press",
      id: "a",
    });
    expect(resolveMixerAction(eng, idle.browse, { type: "cueRelease", id: "a" })).toEqual({
      kind: "engine-cue-release",
      id: "a",
    });
  });

  test("cuePress espelha LEDs na hora, antes do refresh", () => {
    const { eng } = createFakeEngine();
    const idle = createIdleBrowse();
    const order: string[] = [];
    const dispatch = createMixerDispatch({
      eng: {
        ...eng,
        pressCue: (id) => {
          order.push("pressCue");
          eng.pressCue(id);
        },
      },
      browse: idle.browse,
      dispatchReducer: (action) => {
        order.push(`reducer:${action.type}`);
      },
      syncLedsOnCue: () => {
        order.push("syncLedsOnCue");
      },
    });

    dispatch({ type: "cuePress", id: "a" });
    expect(order).toEqual(["pressCue", "syncLedsOnCue", "reducer:refresh"]);
  });

  test("toggleCueMonitor espelha LEDs depois de gravar o PFL no snapshot", () => {
    const { eng } = createFakeEngine();
    const idle = createIdleBrowse();
    const order: string[] = [];
    const dispatch = createMixerDispatch({
      eng,
      browse: idle.browse,
      dispatchReducer: (action) => {
        order.push(`reducer:${action.type}`);
        applyAbsoluteAction(eng, action);
      },
      syncLedsOnCue: () => {
        order.push("syncLedsOnCue");
      },
    });

    dispatch({ type: "toggleCueMonitor", id: "a" });
    expect(order).toEqual(["reducer:cueMonitor", "syncLedsOnCue"]);
  });

  test("pitch não dispara o espelho imediato de LED do cue", () => {
    const { eng } = createFakeEngine();
    const idle = createIdleBrowse();
    const order: string[] = [];
    const dispatch = createMixerDispatch({
      eng,
      browse: idle.browse,
      dispatchReducer: (action) => {
        order.push(`reducer:${action.type}`);
        applyAbsoluteAction(eng, action);
      },
      syncLedsOnCue: () => {
        order.push("syncLedsOnCue");
      },
    });

    dispatch({ type: "pitch", id: "a", value: 0.1 });
    expect(order).toEqual(["reducer:pitch"]);
  });

  test("toggleSync inverte o sync absoluto uma vez", () => {
    const { eng, calls } = createFakeEngine();
    const idle = createIdleBrowse();
    const received: MixerAction[] = [];
    const dispatch = createMixerDispatch({
      eng,
      browse: idle.browse,
      dispatchReducer: (action) => {
        received.push(action);
        applyAbsoluteAction(eng, action);
      },
    });

    eng.snapshot.a.sync = false;
    dispatch({ type: "toggleSync", id: "a" });
    expect(received).toEqual([{ type: "sync", id: "a", value: true }]);
    expect(calls.filter((name) => name === "setSync")).toEqual(["setSync"]);

    dispatch({ type: "toggleSync", id: "a" });
    expect(received[1]).toEqual({ type: "sync", id: "a", value: false });
  });

  test("loopOn e loopOff só chamam toggle quando o estado muda", () => {
    const { eng, calls } = createFakeEngine();
    const idle = createIdleBrowse();
    const received: MixerAction[] = [];
    const dispatch = createMixerDispatch({
      eng,
      browse: idle.browse,
      dispatchReducer: (action) => received.push(action),
    });

    eng.snapshot.a.loop.active = false;
    dispatch({ type: "loopOn", id: "a" });
    expect(calls).toEqual(["toggleLoop"]);
    expect(received).toEqual([{ type: "refresh" }]);

    eng.snapshot.a.loop.active = true;
    dispatch({ type: "loopOn", id: "a" });
    expect(calls).toEqual(["toggleLoop"]);

    dispatch({ type: "loopOff", id: "a" });
    expect(calls).toEqual(["toggleLoop", "toggleLoop"]);

    eng.snapshot.a.loop.active = false;
    dispatch({ type: "loopOff", id: "a" });
    expect(calls).toEqual(["toggleLoop", "toggleLoop"]);
  });

  test("browseLoad emite loadRemoteTrack com o cursor", () => {
    const { eng } = createFakeEngine();
    const idle = createIdleBrowse();
    const ops: { kind: string; deckId?: string; trackId?: string }[] = [];
    const result = dispatchMixerAction(
      {
        eng,
        browse: idle.browse,
        dispatchReducer: () => undefined,
        onUiOp: (op) => ops.push(op),
      },
      { type: "browseLoad", id: "b" },
    );

    expect(result).toEqual({ kind: "ui-only" });
    expect(ops).toEqual([
      { kind: "loadRemoteTrack", deckId: "b", trackId: BROWSE_FIXTURE_TRACKS[0]!.id },
    ]);
  });

  test("browseMove envolve o cursor nos extremos da lista", () => {
    const { eng } = createFakeEngine();
    let cursor = 0;
    const browse = createBrowseState({
      tracks: BROWSE_FIXTURE_TRACKS,
      getCursor: () => cursor,
      setCursor: (index) => {
        cursor = index;
      },
      snapshot: () => eng.snapshot,
    });
    const dispatch = createMixerDispatch({
      eng,
      browse,
      dispatchReducer: () => {
        throw new Error("browse não pode tocar no reducer");
      },
    });

    dispatch({ type: "browseMove", delta: -1 });
    expect(cursor).toBe(BROWSE_FIXTURE_TRACKS.length - 1);

    dispatch({ type: "browseMove", delta: 1 });
    expect(cursor).toBe(0);
  });

  test("cloneMixerSnapshot e phaseToBeat não compartilham identidade", () => {
    const { eng } = createFakeEngine();
    eng.snapshot.a.phase = 0.5;
    const clone = cloneMixerSnapshot(eng.snapshot);
    clone.a.eq.high = 12;
    expect(eng.snapshot.a.eq.high).toBe(0);
    expect(phaseToBeat(eng.snapshot, "a")).toBe(4);
  });

  test("U-07 requestDeckLoad emite loadRemoteTrack", () => {
    const { eng } = createFakeEngine();
    const idle = createIdleBrowse();
    const ops: { kind: string; deckId?: string; trackId?: string }[] = [];
    const dispatch = createMixerDispatch({
      eng,
      browse: idle.browse,
      dispatchReducer: () => undefined,
      onUiOp: (op) => ops.push(op),
    });
    dispatch({ type: "requestDeckLoad", id: "a" });
    expect(ops).toEqual([{ kind: "loadRemoteTrack", deckId: "a", trackId: BROWSE_FIXTURE_TRACKS[0]!.id }]);
  });

  test("U-08 loadDeckFile chama loadDeckFile 1×", () => {
    const { eng, calls } = createFakeEngine();
    const idle = createIdleBrowse();
    const file = new File([new Uint8Array(32)], "kick.mp3");
    const dispatch = createMixerDispatch({
      eng,
      browse: idle.browse,
      dispatchReducer: () => undefined,
    });
    dispatch({ type: "loadDeckFile", id: "a", file });
    expect(calls.filter((name) => name === "loadDeckFile")).toEqual(["loadDeckFile"]);
  });
});

function stubTrack(id: string): DeckTrack {
  return {
    ...EMPTY_DECK_TRACK,
    id,
    title: id || EMPTY_DECK_TRACK.title,
  };
}

function stubDeck(id: DeckId): DeckState {
  return {
    playing: false,
    bpm: 120,
    pitch: 0,
    gain: 0.85,
    trim: 0.72,
    eq: { high: 0, mid: 0, low: 0 },
    filter: 0,
    sync: false,
    keyLock: false,
    keySync: false,
    keyShift: 0,
    slip: false,
    cueMonitor: false,
    jogMode: "cdj",
    quantize: true,
    loop: { active: false, inBeat: null, outBeat: null, mode: "auto", beats: 4, manualNext: "in" },
    hotCues: [{ slot: 1, beat: 0, set: true }],
    cueBeat: 0,
    track: stubTrack(""),
    phase: 0,
    sourceKind: "synthetic",
    durationSec: 0,
    positionSec: 0,
    peaks: null,
    waveformV10: null,
    beatGrid: null,
  };
}

function createFakeEngine(): { eng: MixerEngine; calls: string[] } {
  const calls: string[] = [];
  const snapshot: MixerSnapshot = {
    a: stubDeck("a"),
    b: stubDeck("b"),
    crossfader: 0.5,
    master: 0.82,
    booth: 0.65,
    cueMix: 0.5,
    masterCue: false,
    masterDeck: "a",
  };

  const eng: MixerEngine = {
    snapshot,
    setPitch: () => calls.push("setPitch"),
    setGain: () => calls.push("setGain"),
    setTrim: () => calls.push("setTrim"),
    setFilter: () => calls.push("setFilter"),
    setEq: () => calls.push("setEq"),
    setCrossfader: () => calls.push("setCrossfader"),
    setMaster: () => calls.push("setMaster"),
    setBooth: () => calls.push("setBooth"),
    setCueMix: () => calls.push("setCueMix"),
    setSync: (_id, enabled) => {
      calls.push("setSync");
      snapshot.a.sync = enabled;
    },
    setMasterDeck: () => calls.push("setMasterDeck"),
    setCueMonitor: () => calls.push("setCueMonitor"),
    setJogMode: () => calls.push("setJogMode"),
    setQuantize: () => calls.push("setQuantize"),
    setSlip: () => calls.push("setSlip"),
    setKeyLock: () => calls.push("setKeyLock"),
    setKeySync: () => calls.push("setKeySync"),
    nudgeKeyShift: () => calls.push("nudgeKeyShift"),
    setLoopMode: () => calls.push("setLoopMode"),
    pressSlipHotCue: () => calls.push("pressSlipHotCue"),
    releaseSlipHotCue: () => calls.push("releaseSlipHotCue"),
    callCue: () => calls.push("callCue"),
    pressCue: () => calls.push("pressCue"),
    releaseCue: () => calls.push("releaseCue"),
    setCueBeat: () => calls.push("setCueBeat"),
    setHotCue: () => calls.push("setHotCue"),
    triggerHotCue: () => calls.push("triggerHotCue"),
    toggle: async () => {
      calls.push("toggle");
    },
    toggleLoop: (id) => {
      calls.push("toggleLoop");
      snapshot[id].loop.active = !snapshot[id].loop.active;
    },
    setMasterCue: () => calls.push("setMasterCue"),
    setLoopIn: () => calls.push("setLoopIn"),
    setLoopOut: () => calls.push("setLoopOut"),
    loopHalve: () => calls.push("loopHalve"),
    loopDouble: () => calls.push("loopDouble"),
    setBeatLoop: () => calls.push("setBeatLoop"),
    jumpBeats: () => calls.push("jumpBeats"),
    scratchBegin: () => calls.push("scratchBegin"),
    scratchTick: () => calls.push("scratchTick"),
    scratchEnd: () => calls.push("scratchEnd"),
    nudge: () => calls.push("nudge"),
    ensure: async () => {
      calls.push("ensure");
    },
    audioContext: () => null,
    loadDeckBuffer: () => calls.push("loadDeckBuffer"),
    loadDeckFile: async () => {
      calls.push("loadDeckFile");
    },
    setDeckMeta: () => calls.push("setDeckMeta"),
  };

  return { eng, calls };
}

function createIdleBrowse(snapshot: () => MixerSnapshot = () => createFakeEngine().eng.snapshot) {
  let cursor = 0;
  const browse = createBrowseState({
    tracks: BROWSE_FIXTURE_TRACKS,
    getCursor: () => cursor,
    setCursor: (index) => {
      cursor = index;
    },
    snapshot,
  });
  return {
    browse,
    readCursor: () => cursor,
  };
}
