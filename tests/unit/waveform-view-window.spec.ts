import { describe, expect, it } from "vitest";
import {
  barsToPhaseWindow,
  deckOverviewWindow,
  DEFAULT_MASTER_ZOOM,
  GRID_CYCLE_BARS,
  LOOKBACK_BEATS,
  MASTER_VISIBLE_BARS,
  masterDetailWindow,
  masterVisibleBarsForZoom,
} from "../../src/lib/waveform-view-window";

describe("waveform-view-window", () => {
  it("converte 4 compassos em fração da faixa pelo BPM", () => {
    const fraction = barsToPhaseWindow(120, 240, 4);
    expect(fraction).toBeCloseTo(8 / 240, 2);
  });

  it("fixa o playhead após 4 batidas de lookback no meio da faixa", () => {
    const view = masterDetailWindow(0.5, 120, 240, 4);
    expect(view.playheadT).toBeCloseTo(LOOKBACK_BEATS / (4 * 4), 2);
    expect(view.windowEnd - view.windowStart).toBeCloseTo(8 / 240, 4);
  });

  it("ancora o início da faixa quando o playhead está no começo", () => {
    const view = masterDetailWindow(0, 128, 300);
    expect(view.windowStart).toBe(0);
    expect(view.windowEnd).toBeGreaterThan(0);
    expect(view.playheadT).toBe(0);
  });

  it("ancora o fim da faixa quando o playhead está no final", () => {
    const view = masterDetailWindow(1, 128, 300);
    expect(view.windowEnd).toBe(1);
    expect(view.windowStart).toBeLessThan(1);
    expect(view.playheadT).toBe(1);
  });

  it("expõe o bloco 4×4 e os multiplicadores de zoom", () => {
    expect(GRID_CYCLE_BARS).toBe(4);
    expect(DEFAULT_MASTER_ZOOM).toBe(1);
    expect(MASTER_VISIBLE_BARS).toBe(4);
    expect(masterVisibleBarsForZoom(2)).toBe(8);
    expect(masterVisibleBarsForZoom(3)).toBe(12);
    expect(masterVisibleBarsForZoom(4)).toBe(16);
    expect(masterVisibleBarsForZoom(6)).toBe(24);
  });

  it("usa o loop de 8 beats quando a duração ainda não chegou do engine", () => {
    const view = masterDetailWindow(0.5, 120, 0, 4);
    expect(view.windowEnd - view.windowStart).toBeCloseTo(1, 4);
    expect(view.playheadT).toBeCloseTo(0.5, 4);
  });

  it("expõe a faixa inteira no overview do deck", () => {
    const view = deckOverviewWindow(0.42);
    expect(view.windowStart).toBe(0);
    expect(view.windowEnd).toBe(1);
    expect(view.playheadT).toBe(0.42);
  });
});
