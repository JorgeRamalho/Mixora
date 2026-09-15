import { describe, expect, it } from "vitest";
import { analysisToWaveformV10 } from "../../src/lib/waveform-from-analysis";
import { synthesizeBandsFromWaveform } from "../../src/lib/waveform-bands-synthesize";

describe("waveform-bands-synthesize", () => {
  it("gera três bandas com o mesmo comprimento do waveform mono", () => {
    const waveform = [0.1, 0.9, 0.2, 0.8, 0.15];
    const bands = synthesizeBandsFromWaveform(waveform);
    expect(bands.bass.length).toBe(5);
    expect(bands.mids.length).toBe(5);
    expect(bands.highs.length).toBe(5);
  });

  it("destaca transientes na banda de agudos", () => {
    const waveform = [0.1, 0.1, 0.95, 0.2, 0.2];
    const bands = synthesizeBandsFromWaveform(waveform);
    expect(bands.highs[2]).toBeGreaterThan(bands.highs[1]);
  });

  it("normaliza cada banda pelo P95 independente", () => {
    const waveform = Array.from({ length: 100 }, (_, index) => (index === 50 ? 0.95 : 0.7));
    const bands = synthesizeBandsFromWaveform(waveform);

    const bassMax = Math.max(...bands.bass);
    const midsMax = Math.max(...bands.mids);
    const highsMax = Math.max(...bands.highs);

    expect(bassMax).toBeGreaterThan(0.85);
    expect(midsMax).toBeGreaterThan(0.5);
    expect(highsMax).toBeGreaterThan(0.5);
    expect(highsMax / bassMax).toBeGreaterThan(0.45);
  });
});

describe("analysisToWaveformV10 fallback", () => {
  it("sintetiza bandas quando waveform_bands é null mas waveform V9 existe", () => {
    const bands = analysisToWaveformV10({
      beatport_id: 1,
      available: true,
      version: 9,
      waveform: [0.2, 0.8, 0.3, 0.7],
      waveform_bands: null,
    });
    expect(bands?.bass.length).toBe(4);
    expect(bands?.mids.length).toBe(4);
    expect(bands?.highs.length).toBe(4);
  });
});
