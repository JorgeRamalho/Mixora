import { describe, expect, test } from "vitest";
import {
  analysisToPeaks,
  analysisToWaveformV10,
  peaksFromAnalysis,
  peaksFromV10Bands,
} from "../../src/lib/waveform-from-analysis";
import { rekordboxBandColor, sampleWaveformV10MaxInRange } from "../../src/lib/waveform-v10";

describe("waveform-from-analysis", () => {
  test("peaksFromAnalysis reamostra para binCount", () => {
    const waveform = [0, 0.5, 1, 0.25];
    const peaks = peaksFromAnalysis(waveform, 8);
    expect(peaks.length).toBe(8);
    expect(peaks[0]).toBe(0);
    expect(peaks[4]).toBe(1);
  });

  test("analysisToPeaks retorna null quando indisponível", () => {
    expect(analysisToPeaks({ beatport_id: 1, available: false, waveform: [0.5] })).toBeNull();
    expect(analysisToPeaks({ beatport_id: 1, available: true, waveform: [] })).toBeNull();
    expect(analysisToPeaks(null)).toBeNull();
  });

  test("analysisToPeaks normaliza valores fora de 0–1", () => {
    const peaks = analysisToPeaks(
      {
        beatport_id: 1,
        available: true,
        waveform: [-0.2, 1.5, 0.4],
      },
      3,
    );
    expect(peaks?.[0]).toBe(0);
    expect(peaks?.[1]).toBe(1);
    expect(peaks?.[2]).toBeCloseTo(0.4);
  });

  test("analysisToWaveformV10 extrai bandas válidas", () => {
    const bands = analysisToWaveformV10({
      beatport_id: 1,
      available: true,
      waveform_bands: {
        preset: "dj_v1",
        bass: [0.2, 0.8],
        mids: [0.4, 0.6],
        highs: [0.1, 0.9],
      },
    });
    expect(bands?.bass.length).toBe(2);
    expect(bands?.highs[1]).toBeCloseTo(0.9);
  });

  test("analysisToPeaks prefere V10 quando waveform_bands existe", () => {
    const peaks = analysisToPeaks({
      beatport_id: 1,
      available: true,
      waveform: [0.1, 0.1],
      waveform_bands: {
        preset: "dj_v1",
        bass: [0.0, 1.0],
        mids: [0.0, 0.5],
        highs: [0.0, 0.25],
      },
    }, 2);
    expect(peaks?.[0]).toBe(0);
    expect(peaks?.[1]).toBe(1);
  });

  test("peaksFromV10Bands usa o máximo das três bandas", () => {
    const peaks = peaksFromV10Bands(
      {
        bass: new Float32Array([0.1, 0.9]),
        mids: new Float32Array([0.2, 0.4]),
        highs: new Float32Array([0.3, 0.2]),
      },
      2,
    );
    expect(peaks[0]).toBeCloseTo(0.3);
    expect(peaks[1]).toBeCloseTo(0.9);
  });
});

describe("waveform-v10", () => {
  test("rekordboxBandColor pondera graves em azul e agudos em vermelho", () => {
    const low = rekordboxBandColor(1, 0, 0);
    const high = rekordboxBandColor(0, 0, 1);
    expect(low).toMatch(/rgb\(\d+, \d+, \d+\)/);
    expect(high).not.toBe(low);
  });

  test("sampleWaveformV10MaxInRange captura o pico dentro do intervalo", () => {
    const sample = sampleWaveformV10MaxInRange(
      {
        bass: new Float32Array([0.1, 0.9, 0.2]),
        mids: new Float32Array([0.1, 0.4, 0.2]),
        highs: new Float32Array([0.1, 0.3, 0.2]),
      },
      0.34,
      0.66,
    );
    expect(sample.bass).toBeCloseTo(0.9);
    expect(sample.mids).toBeCloseTo(0.4);
    expect(sample.highs).toBeCloseTo(0.3);
  });
});
