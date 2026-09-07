import { expect, test } from "@playwright/test";
import { applyAbsoluteAction, type MixerEngine } from "../../src/lib/mixer-dispatch";
import { MIXER_ACTION_ROUTES, getActionRoute } from "../../src/lib/mixer-action-routing";
import { assertAllowedInReducer } from "../../src/lib/mixer-assert";
import type { DeckId, DeckState, MixerSnapshot, TrainingTrack } from "../../src/types/mixer";
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

function stubTrack(id: string): TrainingTrack {
  return {
    id,
    title: id,
    artist: "MIXORA",
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
    eqKill: { high: false, mid: false, low: false },
    filter: 0,
    sync: false,
    masterTempo: id === "a",
    cueMonitor: false,
    jogMode: "cdj",
    quantize: true,
    loop: { active: false, inBeat: null, outBeat: null },
    hotCues: [{ slot: 1, beat: 0, set: true }],
    cueBeat: 0,
    track: stubTrack(id),
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
    djOnline: false,
  };
  const eng: MixerEngine = {
    snapshot,
    setPitch: () => calls.push("setPitch"),
    setGain: () => calls.push("setGain"),
    setTrim: () => calls.push("setTrim"),
    setFilter: () => calls.push("setFilter"),
    setEq: () => calls.push("setEq"),
    setEqKill: () => calls.push("setEqKill"),
    setCrossfader: () => calls.push("setCrossfader"),
    setMaster: () => calls.push("setMaster"),
    setBooth: () => calls.push("setBooth"),
    setCueMix: () => calls.push("setCueMix"),
    setSync: () => calls.push("setSync"),
    setMasterDeck: () => calls.push("setMasterDeck"),
    setCueMonitor: () => calls.push("setCueMonitor"),
    setJogMode: () => calls.push("setJogMode"),
    setQuantize: () => calls.push("setQuantize"),
    loadTrack: () => calls.push("loadTrack"),
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
    nudge: () => calls.push("nudge"),
    ensure: async () => {
      calls.push("ensure");
    },
    loadDeckBuffer: () => calls.push("loadDeckBuffer"),
    loadDeckFile: async () => {
      calls.push("loadDeckFile");
    },
    setDeckMeta: () => calls.push("setDeckMeta"),
    setDjOnline: () => calls.push("setDjOnline"),
  };
  return { eng, calls };
}
