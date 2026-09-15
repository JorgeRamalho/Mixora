import { describe, expect, it } from "vitest";
import {
  cdjDeckViewEqual,
  masterWaveDeckViewEqual,
  selectCdjDeckView,
  selectMasterWaveDeckView,
} from "../../src/lib/mixer-component-selectors";
import { createDeckLoop } from "../../src/types/mixer";
import type { MixerSnapshot } from "../../src/types/mixer";

function makeSnapshot(): MixerSnapshot {
  const loop = createDeckLoop();
  const baseDeck = {
    playing: false,
    bpm: 128,
    pitch: 0,
    gain: 1,
    trim: 0,
    eq: { high: 0, mid: 0, low: 0 },
    filter: 0,
    sync: false,
    keyLock: false,
    keySync: false,
    keyShift: 0,
    slip: false,
    cueMonitor: false,
    jogMode: "cdj" as const,
    quantize: true,
    loop,
    hotCues: [],
    cueBeat: 0,
    track: {
      id: "track-a",
      title: "Alpha",
      artist: "Artist",
      key: "8A",
      bpm: 128,
      durationMs: 180000,
    },
    phase: 0,
    sourceKind: "synthetic" as const,
    durationSec: 180,
    positionSec: 0,
    peaks: null,
    waveformV10: null,
    beatGrid: null,
  };

  return {
    a: { ...baseDeck },
    b: {
      ...baseDeck,
      track: { ...baseDeck.track, id: "track-b", title: "Beta", key: "9A" },
    },
    crossfader: 0,
    master: 1,
    booth: 1,
    cueMix: 0.5,
    masterCue: false,
    masterDeck: "a",
  };
}

describe("mixer-component-selectors", () => {
  it("selectMasterWaveDeckView projeta apenas campos de waveform", () => {
    const snap = makeSnapshot();
    snap.a.playing = true;

    const view = selectMasterWaveDeckView(snap, "a");

    expect(view.spinning).toBe(true);
    expect(view.camelotKey).toBe("8A");
    expect(view.accentColor).toMatch(/^#/);
  });

  it("masterWaveDeckViewEqual ignora mudanças irrelevantes", () => {
    const snap = makeSnapshot();
    const left = selectMasterWaveDeckView(snap, "a");
    snap.a.pitch = 2.5;
    const right = selectMasterWaveDeckView(snap, "a");

    expect(masterWaveDeckViewEqual(left, right)).toBe(true);
  });

  it("selectCdjDeckView reage a pitch e ignora crossfader", () => {
    const snap = makeSnapshot();
    const before = selectCdjDeckView(snap, "a", "8A");

    snap.crossfader = 0.75;
    const afterCrossfader = selectCdjDeckView(snap, "a", "8A");
    expect(cdjDeckViewEqual(before, afterCrossfader)).toBe(true);

    snap.a.pitch = 1.2;
    const afterPitch = selectCdjDeckView(snap, "a", "8A");
    expect(cdjDeckViewEqual(before, afterPitch)).toBe(false);
    expect(afterPitch.pitch).toBe(1.2);
  });

  it("selectCdjDeckView expõe o código Camelot no visor BPM/key", () => {
    const snap = makeSnapshot();
    const view = selectCdjDeckView(snap, "a", "8A");

    expect(view.camelotLabel).toBe("8A");
    expect(view.musicalKeyLabel).toBe("Am");
    expect(view.keyLabel).toContain("Am");
  });
});
