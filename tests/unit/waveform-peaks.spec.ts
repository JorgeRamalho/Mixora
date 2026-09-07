import { describe, expect, test } from "vitest";
import { computePeaks } from "../../src/lib/waveform-peaks";
import { MockAudioContext } from "../helpers/mock-audio-context";

describe("waveform-peaks", () => {
  test("U-03 peaks.length === binCount", () => {
    const ctx = new MockAudioContext();
    const buffer = ctx.createBuffer(1, 4410, 44100);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = 0.5;
    const peaks = computePeaks(buffer, 64);
    expect(peaks.length).toBe(64);
    expect(peaks[0]).toBeGreaterThan(0);
  });

  test("U-04 silêncio → amplitudes baixas", () => {
    const ctx = new MockAudioContext();
    const buffer = ctx.createBuffer(1, 4410, 44100);
    const peaks = computePeaks(buffer, 32);
    expect(Math.max(...peaks)).toBe(0);
  });
});
