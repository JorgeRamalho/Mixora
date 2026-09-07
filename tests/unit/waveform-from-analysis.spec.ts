import { describe, expect, test } from "vitest";
import { analysisToPeaks, peaksFromAnalysis } from "../../src/lib/waveform-from-analysis";

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
    const peaks = analysisToPeaks({
      beatport_id: 1,
      available: true,
      waveform: [-0.2, 1.5, 0.4],
    }, 3);
    expect(peaks?.[0]).toBe(0);
    expect(peaks?.[1]).toBe(1);
    expect(peaks?.[2]).toBeCloseTo(0.4);
  });
});
