import { describe, expect, it } from "vitest";
import {
  beatGridFromAnalysis,
  beatMarkerKind,
  beatMarkersInWindow,
} from "../../src/lib/beat-grid";
import type { AudioAnalysisResponse } from "../../src/lib/tracks-api/types";

const IN_THE_MOMENT: AudioAnalysisResponse = {
  beatport_id: 20465084,
  available: true,
  version: 10,
  bar_seconds: 1.9504761904761905,
  bpm_refined: 123.046875,
  phrase_bars: 8,
  duration_hint_sec: 312.10839002267574,
  hot_cues: [
    { id: "mixin", kind: "mixin", label: "Mix-in", bar: 16, sec: 31.41659863945578, quality: 0.88 },
    { id: "drop", kind: "drop", label: "Drop", bar: 119, sec: 232.3156462585034, quality: null },
  ],
  structure_cues: [],
};

describe("beatGridFromAnalysis", () => {
  it("reconstrói BPM e offset a partir de bar_seconds e cues bar+sec", () => {
    const grid = beatGridFromAnalysis(IN_THE_MOMENT);
    expect(grid?.bpm).toBeCloseTo(123.046875);
    expect(grid?.beatsPerBar).toBe(4);
    expect(grid?.phraseBars).toBe(8);
    expect(grid?.offsetSec).toBeCloseTo(31.41659863945578 - 16 * 1.9504761904761905, 8);
  });

  it("aceita mixin no compasso 0 como offset direto", () => {
    const grid = beatGridFromAnalysis({
      beatport_id: 29218745,
      available: true,
      bpm_refined: 129.1992,
      bar_seconds: 1.857596,
      phrase_bars: 8,
      hot_cues: [{ id: "mixin", kind: "mixin", label: "Mix-in", bar: 0, sec: 0.510839 }],
    });
    expect(grid?.offsetSec).toBeCloseTo(0.510839);
    expect(grid?.bpm).toBeCloseTo(129.1992);
  });

  it("deriva BPM de bar_seconds quando bpm_refined falta", () => {
    const grid = beatGridFromAnalysis({
      beatport_id: 1,
      available: true,
      bar_seconds: 2,
    });
    expect(grid?.bpm).toBeCloseTo(120);
    expect(grid?.offsetSec).toBe(0);
  });

  it("devolve null sem tempo de grid", () => {
    expect(beatGridFromAnalysis({ beatport_id: 1, available: true })).toBeNull();
    expect(beatGridFromAnalysis({ beatport_id: 1, available: false, bpm_refined: 128 })).toBeNull();
    expect(beatGridFromAnalysis(null)).toBeNull();
  });
});

describe("beatMarkersInWindow", () => {
  it("alinha o primeiro downbeat ao offset e marca frase a cada 8 compassos", () => {
    const offset = 0.209;
    const bpm = 120;
    const duration = 8;
    const markers = beatMarkersInWindow(0, 1, duration, 800, bpm, offset, 4, 8);
    expect(markers[0]?.sec).toBeCloseTo(offset);
    expect(markers[0]?.kind).toBe("phrase");
    expect(markers[4]?.kind).toBe("bar");
    expect(markers[1]?.kind).toBe("beat");
    const beatSec = 0.5;
    expect(markers[1]?.x).toBeCloseTo(((offset + beatSec) / duration) * 800);
  });

  it("classifica índice negativo com o mesmo ciclo de compasso", () => {
    expect(beatMarkerKind(-16, 4, 4)).toBe("phrase");
    expect(beatMarkerKind(-4, 4, 4)).toBe("bar");
    expect(beatMarkerKind(-3, 4, 4)).toBe("beat");
    expect(beatMarkerKind(0, 4, 8)).toBe("phrase");
  });
});
