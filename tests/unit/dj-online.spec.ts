import { describe, expect, test } from "vitest";
import { analyzeAudioBuffer, detectBpm, type AnalyzableBuffer } from "../../src/lib/audio-analyze";
import { pickMasterDeck, planDjOnline } from "../../src/lib/dj-online";
import { camelotFromPitchClass, isCamelotKey } from "../../src/lib/musical-key";
import type { DeckState, MixerSnapshot } from "../../src/types/mixer";

function stubDeck(id: "a" | "b", overrides: Partial<DeckState> = {}): DeckState {
  return {
    playing: false,
    bpm: id === "a" ? 126 : 124,
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
    hotCues: [],
    cueBeat: 0,
    track: {
      id: id === "a" ? "radio-spotify-01" : "radio-deezer-02",
      title: id === "a" ? "Levels" : "Wake Me Up",
      artist: "Avicii",
      genre: "House",
      bpm: id === "a" ? 126 : 124,
      key: id === "a" ? "4B" : "3B",
      scale: "Ab major",
      duration: "3:00",
      grid: "HOUSE",
    },
    phase: 0,
    sourceKind: "synthetic",
    durationSec: 0,
    positionSec: 0,
    peaks: null,
    ...overrides,
  };
}

function snap(overrides: Partial<MixerSnapshot> = {}): MixerSnapshot {
  return {
    a: stubDeck("a"),
    b: stubDeck("b"),
    crossfader: 0.5,
    master: 0.82,
    booth: 0.65,
    cueMix: 0.5,
    masterDeck: "a",
    djOnline: false,
    ...overrides,
  };
}

function kickBuffer(bpm: number, seconds = 4, sampleRate = 22050): AnalyzableBuffer {
  const length = Math.floor(sampleRate * seconds);
  const data = new Float32Array(length);
  const step = Math.floor((60 / bpm) * sampleRate);
  const dur = Math.floor(sampleRate * 0.06);
  for (let at = 0; at < length; at += step) {
    for (let i = 0; i < dur && at + i < length; i += 1) {
      const t = i / sampleRate;
      data[at + i] = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t * 28);
    }
  }
  return {
    sampleRate,
    numberOfChannels: 1,
    length,
    getChannelData: () => data,
  };
}

describe("DJ ONLINE — plano Camelot e MASTER/SYNC", () => {
  test("4B e 3B são vizinhos e o slave é o deck B com o crossfader no centro", () => {
    const plan = planDjOnline(snap());
    expect(plan.masterDeck).toBe("a");
    expect(plan.syncDeck).toBe("b");
    expect(plan.relation).toBe("neighbor");
    expect(plan.harmony).toBe("compatible");
    expect(plan.melodyPath).toEqual(["4B", "4A", "5A", "5B"]);
  });

  test("crossfader à direita elege o deck B como MASTER", () => {
    expect(pickMasterDeck(snap({ crossfader: 0.8 }))).toBe("b");
    expect(pickMasterDeck(snap({ crossfader: 0.1 }))).toBe("a");
  });

  test("no centro, o deck que está tocando vira MASTER", () => {
    expect(pickMasterDeck(snap({ b: stubDeck("b", { playing: true }) }))).toBe("b");
  });
});

describe("Camelot a partir da classe de altura", () => {
  test("Dó menor é 5A e Dó maior é 8B", () => {
    expect(camelotFromPitchClass(0, "menor")).toBe("5A");
    expect(camelotFromPitchClass(0, "maior")).toBe("8B");
    expect(camelotFromPitchClass(9, "menor")).toBe("8A");
    expect(isCamelotKey("8A")).toBe(true);
    expect(isCamelotKey("—")).toBe(false);
  });
});

describe("análise de áudio da cabine", () => {
  test("detecta BPM de um loop de kick a 120", () => {
    const bpm = detectBpm(kickBuffer(120).getChannelData(0), 22050);
    expect(bpm).toBeGreaterThanOrEqual(118);
    expect(bpm).toBeLessThanOrEqual(122);
  });

  test("analyzeAudioBuffer devolve hora Camelot válida", () => {
    const result = analyzeAudioBuffer(kickBuffer(128));
    expect(result.bpm).toBeGreaterThanOrEqual(70);
    expect(result.bpm).toBeLessThanOrEqual(180);
    expect(isCamelotKey(result.key)).toBe(true);
  });
});
