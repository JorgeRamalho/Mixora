import { expect, test } from "@playwright/test";
import { TRAINING_TRACKS } from "../../src/data/training-tracks";
import { createBrowseState, wrapCursor } from "../../src/lib/mixer-browse";
import {
  applyAbsoluteAction,
  createMixerDispatch,
  dispatchMixerAction,
  resolveMixerAction,
  type MixerEngine,
} from "../../src/lib/mixer-dispatch";
import { cloneMixerSnapshot, phaseToBeat } from "../../src/lib/mixer-snapshot";
import type { DeckId, DeckState, MixerAction, MixerSnapshot, TrainingTrack } from "../../src/types/mixer";

test.describe("dispatcher do mixer — intenção e browse", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "dispatcher puro, um projeto basta");
  });

  test("wrapCursor dá a volta nas pontas da lista", () => {
    const total = TRAINING_TRACKS.length;
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

    expect(resolveMixerAction(eng, idle.browseByDeck, idle.getMasterDeck, { type: "cuePress", id: "a" })).toEqual({
      kind: "engine-cue-press",
      id: "a",
    });
    expect(resolveMixerAction(eng, idle.browseByDeck, idle.getMasterDeck, { type: "cueRelease", id: "a" })).toEqual({
      kind: "engine-cue-release",
      id: "a",
    });
  });

  test("toggleSync inverte o sync absoluto uma vez", () => {
    const { eng, calls } = createFakeEngine();
    const idle = createIdleBrowse();
    const received: MixerAction[] = [];
    const dispatch = createMixerDispatch({
      eng,
      browseByDeck: idle.browseByDeck,
      getMasterDeck: idle.getMasterDeck,
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
      browseByDeck: idle.browseByDeck,
      getMasterDeck: idle.getMasterDeck,
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

  test("browseLoad arma o picker de arquivo do deck", () => {
    const { eng } = createFakeEngine();
    const idle = createIdleBrowse();
    const ops: Array<{ kind: string; deckId?: string }> = [];
    const result = dispatchMixerAction(
      {
        eng,
        browseByDeck: idle.browseByDeck,
        getMasterDeck: idle.getMasterDeck,
        dispatchReducer: () => undefined,
        onUiOp: (op) => ops.push(op),
      },
      { type: "browseLoad", id: "b" },
    );

    expect(result).toEqual({ kind: "ui-only" });
    expect(ops).toEqual([{ kind: "armFilePicker", deckId: "b" }]);
  });

  test("browseMove envolve o cursor nos extremos da lista", () => {
    const { eng } = createFakeEngine();
    let cursor = 0;
    const browseByDeck = {
      a: createBrowseState({
        tracks: TRAINING_TRACKS,
        getCursor: () => cursor,
        setCursor: (index) => {
          cursor = index;
        },
        snapshot: () => eng.snapshot,
      }),
      b: createBrowseState({
        tracks: TRAINING_TRACKS,
        getCursor: () => cursor,
        setCursor: (index) => {
          cursor = index;
        },
        snapshot: () => eng.snapshot,
      }),
    };
    const dispatch = createMixerDispatch({
      eng,
      browseByDeck,
      getMasterDeck: () => "a",
      dispatchReducer: () => {
        throw new Error("browse não pode tocar no reducer");
      },
    });

    dispatch({ type: "browseMove", delta: -1 });
    expect(cursor).toBe(TRAINING_TRACKS.length - 1);

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

  test("U-07 requestDeckLoad emite openFilePicker", () => {
    const { eng } = createFakeEngine();
    const idle = createIdleBrowse();
    const ops: { kind: string }[] = [];
    const dispatch = createMixerDispatch({
      eng,
      browseByDeck: idle.browseByDeck,
      getMasterDeck: idle.getMasterDeck,
      dispatchReducer: () => undefined,
      onUiOp: (op) => ops.push(op),
    });
    dispatch({ type: "requestDeckLoad", id: "a" });
    expect(ops).toEqual([{ kind: "openFilePicker", deckId: "a" }]);
  });

  test("U-08 loadDeckFile chama loadDeckFile 1×", () => {
    const { eng, calls } = createFakeEngine();
    const idle = createIdleBrowse();
    const file = new File([new Uint8Array(32)], "kick.mp3");
    const dispatch = createMixerDispatch({
      eng,
      browseByDeck: idle.browseByDeck,
      getMasterDeck: idle.getMasterDeck,
      dispatchReducer: () => undefined,
    });
    dispatch({ type: "loadDeckFile", id: "a", file });
    expect(calls.filter((name) => name === "loadDeckFile")).toEqual(["loadDeckFile"]);
  });
});

function stubTrack(id: string): TrainingTrack {
  return {
    id,
    title: id,
    artist: "Mamute",
    genre: "House",
    bpm: 120,
    key: "4B",
    scale: "C major",
    duration: "3:00",
    grid: "HOUSE · 4/4",
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
    masterTempo: id === "a",
    cueMonitor: false,
    jogMode: "cdj",
    quantize: true,
    loop: { active: false, inBeat: null, outBeat: null },
    hotCues: [{ slot: 1, beat: 0, set: true }],
    cueBeat: 0,
    track: stubTrack(id === "a" ? "radio-spotify-01" : "radio-deezer-02"),
    phase: 0,
    sourceKind: "synthetic",
    durationSec: 0,
    positionSec: 0,
    peaks: null,
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
    loadTrack: (id, trackId) => {
      calls.push("loadTrack");
      const track = TRAINING_TRACKS.find((item) => item.id === trackId);
      if (track) snapshot[id].track = track;
    },
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
    nudge: () => calls.push("nudge"),
    ensure: async () => {
      calls.push("ensure");
    },
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
    tracks: TRAINING_TRACKS,
    getCursor: () => cursor,
    setCursor: (index) => {
      cursor = index;
    },
    snapshot,
  });
  return {
    browseByDeck: { a: browse, b: browse },
    getMasterDeck: () => "a" as DeckId,
    readCursor: () => cursor,
  };
}
