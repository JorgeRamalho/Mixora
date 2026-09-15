import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWaveformRafScheduler,
  WAVEFORM_FRAME_INTERVAL_MS,
  WAVEFORM_TARGET_FPS,
} from "../../src/lib/waveform-raf-scheduler";

describe("waveform-raf-scheduler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Monta um scheduler com RAF e relógio simulados.
   * @param nowMs Relógio monotônico em milissegundos
   */
  function makeScheduler(nowMs = 0) {
    const callbacks = new Map<number, (timestamp: number) => void>();
    let nextId = 1;
    let time = nowMs;

    const scheduler = createWaveformRafScheduler(WAVEFORM_TARGET_FPS, {
      requestFrame: (callback) => {
        const id = nextId++;
        callbacks.set(id, callback);
        return id;
      },
      cancelFrame: (id) => {
        callbacks.delete(id);
      },
      now: () => time,
    });

    return {
      scheduler,
      advance(ms: number) {
        time += ms;
      },
      flushRaf() {
        const pending = [...callbacks.entries()];
        callbacks.clear();
        for (const [, callback] of pending) {
          callback(time);
        }
      },
    };
  }

  it("expõe 60 fps e intervalo de ~16 ms", () => {
    expect(WAVEFORM_TARGET_FPS).toBe(60);
    expect(WAVEFORM_FRAME_INTERVAL_MS).toBeCloseTo(16.667, 2);
  });

  it("inicia o RAF ao registrar o primeiro listener", () => {
    const { scheduler, flushRaf } = makeScheduler();
    const paint = vi.fn();

    scheduler.subscribe(paint);
    expect(scheduler.isRunning()).toBe(true);
    expect(scheduler.listenerCount()).toBe(1);

    flushRaf();
    expect(paint).toHaveBeenCalledTimes(1);

    scheduler.reset();
    expect(scheduler.isRunning()).toBe(false);
  });

  it("agrupa vários canvas no mesmo lote de repaint", () => {
    const { scheduler, flushRaf } = makeScheduler();
    const paintA = vi.fn();
    const paintB = vi.fn();

    scheduler.subscribe(paintA);
    scheduler.subscribe(paintB);
    flushRaf();

    expect(paintA).toHaveBeenCalledTimes(1);
    expect(paintB).toHaveBeenCalledTimes(1);
  });

  it("repinta em cada vsync sem throttle artificial", () => {
    const harness = makeScheduler();
    const paint = vi.fn();

    harness.scheduler.subscribe(paint);
    harness.flushRaf();
    expect(paint).toHaveBeenCalledTimes(1);

    harness.advance(10);
    harness.flushRaf();
    expect(paint).toHaveBeenCalledTimes(2);

    harness.advance(WAVEFORM_FRAME_INTERVAL_MS);
    harness.flushRaf();
    expect(paint).toHaveBeenCalledTimes(3);
  });

  it("encerra o RAF quando o último listener sai", () => {
    const { scheduler, flushRaf } = makeScheduler();
    const paint = vi.fn();

    const unsubscribe = scheduler.subscribe(paint);
    flushRaf();
    expect(scheduler.isRunning()).toBe(true);

    unsubscribe();
    expect(scheduler.listenerCount()).toBe(0);
    expect(scheduler.isRunning()).toBe(false);
  });
});
