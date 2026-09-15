import { describe, expect, it } from "vitest";
import {
  drawDiscoverWaveform,
  DRAW_PATH_MAX_SAMPLES,
  pointwiseMax,
  resampleForDrawPath,
  resolveWaveLayers,
  sampleSyntheticBeatAmplitudes,
  sampleViewportAmplitudes,
  WAVEFORM_MIRROR_CLONES,
} from "../../src/lib/waveform-draw-waves";
import type { WaveformV10Bands } from "../../src/types/mixer";

function mockCtx(): CanvasRenderingContext2D & { calls: { fill: number; stroke: number; bezier: number } } {
  const calls = { fill: 0, stroke: 0, bezier: 0 };
  const ctx = {
    calls,
    clearRect: () => undefined,
    fillRect: () => undefined,
    save: () => undefined,
    restore: () => undefined,
    beginPath: () => undefined,
    rect: () => undefined,
    clip: () => undefined,
    moveTo: () => undefined,
    lineTo: () => undefined,
    bezierCurveTo: () => {
      calls.bezier += 1;
    },
    closePath: () => undefined,
    fill: () => {
      calls.fill += 1;
    },
    stroke: () => {
      calls.stroke += 1;
    },
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    createRadialGradient: () => ({ addColorStop: () => undefined }),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  };
  return ctx as unknown as CanvasRenderingContext2D & { calls: { fill: number; stroke: number; bezier: number } };
}

const bands: WaveformV10Bands = {
  bass: new Float32Array([0.1, 0.8, 0.2]),
  mids: new Float32Array([0.4, 0.2, 0.9]),
  highs: new Float32Array([0.7, 0.3, 0.1]),
};

describe("waveform-draw-waves", () => {
  it("usa as três bandas quando o V10 é válido", () => {
    const layers = resolveWaveLayers(bands, new Float32Array([0.5]));
    expect(layers.map((layer) => layer.id)).toEqual(["bass", "mids", "highs"]);
  });

  it("cai no envelope mono quando as bandas faltam", () => {
    const peaks = new Float32Array([0.2, 0.4, 0.6]);
    const layers = resolveWaveLayers(null, peaks);
    expect(layers).toHaveLength(1);
    expect(layers[0]?.id).toBe("mono");
  });

  it("usa placeholder quando não há picos nem bandas", () => {
    const layers = resolveWaveLayers(null, null);
    expect(layers[0]?.id).toBe("mono");
    expect(layers[0]?.values.length).toBeGreaterThan(8);
    expect(Math.max(...layers[0]!.values)).toBeGreaterThan(0.2);
  });

  it("amostra o viewport em px → trackT → amp", () => {
    const series = new Float32Array([0, 1, 0]);
    const samples = sampleViewportAmplitudes(series, 0, 1, 2);
    expect(samples).toHaveLength(3);
    expect(samples[0]).toBeCloseTo(0);
    expect(samples[1]).toBeCloseTo(1);
    expect(samples[2]).toBeCloseTo(0);
  });

  it("reduz o path de desenho em canvases largos", () => {
    const source = new Float32Array(DRAW_PATH_MAX_SAMPLES + 200).fill(0.5);
    source[42] = 0.95;
    const path = resampleForDrawPath(source, 1200);
    expect(path.length).toBeLessThanOrEqual(DRAW_PATH_MAX_SAMPLES + 1);
    expect(Math.max(...path)).toBeGreaterThan(0.9);
  });

  it("calcula o envelope externo das camadas já amostradas", () => {
    const envelope = pointwiseMax([
      [0.1, 0.8],
      [0.4, 0.2],
      [0.7, 0.3],
    ]);
    expect(envelope).toHaveLength(2);
    expect(envelope[0]).toBeCloseTo(0.7);
    expect(envelope[1]).toBeCloseTo(0.8);
  });
});

function expectedLayerFills(layerCount: number): number {
  const clonesPerLayer = WAVEFORM_MIRROR_CLONES + 1;
  const regions = 2;
  return layerCount * clonesPerLayer * regions;
}

describe("drawDiscoverWaveform", () => {
  it("preenche ribbons overlapping com clones espelhados quando há bandas V10", () => {
    const ctx = mockCtx();
    drawDiscoverWaveform(ctx, {
      width: 8,
      height: 40,
      windowStart: 0,
      windowEnd: 1,
      playheadT: 0.4,
      bands,
      peaks: null,
    });
    expect(ctx.calls.fill).toBe(expectedLayerFills(3));
    expect(ctx.calls.stroke).toBeGreaterThan(2);
    expect(ctx.calls.bezier).toBeGreaterThan(0);
  });

  it("preenche clones mono quando só há picos", () => {
    const ctx = mockCtx();
    drawDiscoverWaveform(ctx, {
      width: 8,
      height: 40,
      windowStart: 0,
      windowEnd: 1,
      playheadT: 0.4,
      bands: null,
      peaks: new Float32Array([0.2, 0.4, 0.6]),
    });
    expect(ctx.calls.fill).toBe(expectedLayerFills(1));
    expect(ctx.calls.stroke).toBeGreaterThan(2);
  });

  it("preenche o fallback de batida quando não há picos nem bandas", () => {
    const ctx = mockCtx();
    drawDiscoverWaveform(ctx, {
      width: 8,
      height: 40,
      windowStart: 0,
      windowEnd: 1,
      playheadT: 0.25,
      bands: null,
      peaks: null,
      bpm: 128,
      durationSec: 8,
    });
    expect(ctx.calls.fill).toBe(expectedLayerFills(1));
    expect(ctx.calls.bezier).toBeGreaterThan(0);
  });

  it("desenha o beatgrid na visão detalhada sem quebrar o overlapping", () => {
    const ctx = mockCtx();
    drawDiscoverWaveform(ctx, {
      width: 200,
      height: 40,
      windowStart: 0,
      windowEnd: 1,
      playheadT: 0.4,
      bands,
      peaks: null,
      showBeatGrid: true,
      bpm: 120,
      durationSec: 2,
      offsetSec: 0.25,
      phraseBars: 8,
    });
    expect(ctx.calls.fill).toBe(expectedLayerFills(3));
    expect(ctx.calls.stroke).toBeGreaterThan(3);
  });

  it("aceita o código Camelot sem quebrar o overlapping", () => {
    const ctx = mockCtx();
    drawDiscoverWaveform(ctx, {
      width: 8,
      height: 40,
      windowStart: 0,
      windowEnd: 1,
      playheadT: 0.4,
      bands,
      peaks: null,
      camelotKey: "4B",
    });
    expect(ctx.calls.fill).toBe(expectedLayerFills(3));
  });
});

describe("sampleSyntheticBeatAmplitudes", () => {
  it("marca um kick no começo de cada batida", () => {
    const samples = sampleSyntheticBeatAmplitudes(0, 1, 64, 120, 2);
    expect(samples[0]).toBeGreaterThan(0.7);
    expect(Math.min(...samples)).toBeLessThan(0.55);
  });
});
