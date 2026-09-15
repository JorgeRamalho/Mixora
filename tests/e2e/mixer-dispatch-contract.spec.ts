import { expect, test } from "@playwright/test";
import { applyAbsoluteAction, type MixerEngine } from "../../src/lib/mixer-dispatch";
import { MIXER_ACTION_ROUTES, getActionRoute } from "../../src/lib/mixer-action-routing";
import { assertAllowedInReducer } from "../../src/lib/mixer-assert";
import { EMPTY_DECK_TRACK } from "../../src/lib/deck-track";
import type { DeckId, DeckState, MixerSnapshot, DeckTrack } from "../../src/types/mixer";
import { MIXER_ACTION_SAMPLES } from "../helpers/mixer-contract-fixtures";

test.describe("contrato do reducer do mixer", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "contrato puro, um projeto basta");
  });

  test("todo MixerAction type tem rota na tabela", () => {
    const sampleKeys = Object.keys(MIXER_ACTION_SAMPLES).sort();
    const routeKeys = Object.keys(MIXER_ACTION_ROUTES).sort();
    expect(sampleKeys).toEqual(routeKeys);
    for (const type of sampleKeys) {
      const key = type as keyof typeof MIXER_ACTION_ROUTES;
      expect(getActionRoute(key)).toBe(MIXER_ACTION_ROUTES[key]);
    }
  });

  test("misroute de toggle no reducer lança [MixerContract]", () => {
    expect(() => assertAllowedInReducer({ type: "toggle", id: "a" })).toThrow(
      /\[MixerContract\]/,
    );
    expect(() => assertAllowedInReducer({ type: "nudge", id: "a", direction: 1 })).toThrow(
      /\[MixerContract\]/,
    );
    expect(() => assertAllowedInReducer({ type: "browseLoad", id: "a" })).toThrow(
      /\[MixerContract\]/,
    );
  });

  test("pitch no reducer chama setPitch 1× e não lança", () => {
    const { eng, calls } = createFakeEngine();
    expect(() => assertAllowedInReducer({ type: "pitch", id: "a", value: 2 })).not.toThrow();
    applyAbsoluteAction(eng, { type: "pitch", id: "a", value: 2 });
    expect(calls.filter((name) => name === "setPitch")).toEqual(["setPitch"]);
  });
});

function stubTrack(id: string): DeckTrack {
  return { ...EMPTY_DECK_TRACK, id, title: id || EMPTY_DECK_TRACK.title };
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
    track: stubTrack(id),
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
    setMasterCue: () => calls.push("setMasterCue"),
    setSync: () => calls.push("setSync"),
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
    toggleLoop: () => calls.push("toggleLoop"),
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
