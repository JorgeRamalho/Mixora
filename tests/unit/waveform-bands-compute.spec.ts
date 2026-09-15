import { describe, expect, it } from "vitest";
import { resolveDetailBinCount } from "../../src/lib/waveform-bands-compute";

describe("waveform-bands-compute", () => {
  it("resolve bins de detalhe proporcionais à duração", () => {
    expect(resolveDetailBinCount(60)).toBe(4096);
    expect(resolveDetailBinCount(300)).toBeGreaterThanOrEqual(12000);
    expect(resolveDetailBinCount(600)).toBe(16384);
  });
});
