import { beforeEach, describe, expect, test, vi } from "vitest";
import type { MixerSnapshot } from "../../src/types/mixer";
import { DDJ_STATUS, DECK_NOTE, MIXER_NOTE } from "../../src/lib/midi/ddj-400-protocol";

const sendMidiOutput = vi.fn();

vi.mock("../../src/lib/midi/midi-session", () => ({
  sendMidiOutput: (...args: unknown[]) => sendMidiOutput(...args),
}));

import { resetDdj400LedCache, syncDdj400Leds } from "../../src/lib/midi/ddj-400-led-sync";

/**
 * Snapshot mínimo para espelhar só os LEDs de transporte e cue.
 */
function baseSnap(overrides?: Partial<MixerSnapshot>): MixerSnapshot {
  const deck = {
    playing: false,
    sync: false,
    cueMonitor: false,
    loop: { active: false, mode: "beat" as const, beats: 4, manualNext: "out" as const },
    hotCues: Array.from({ length: 8 }, (_, index) => ({ set: index === 0, slot: index + 1 })),
    track: { id: "", title: "", artist: "", bpm: 120, key: "8A", durationMs: 0 },
    gain: 1,
    trim: 1,
    pitch: 0,
    filter: 0,
    eq: { high: 0, mid: 0, low: 0 },
    jogMode: "cdj" as const,
    quantize: false,
    slip: false,
    keyLock: false,
    keySync: false,
    cueBeat: 0,
    phase: 0,
  };

  return {
    a: { ...deck },
    b: { ...deck },
    masterDeck: "a",
    masterCue: false,
    master: 1,
    booth: 1,
    cueMix: 0.5,
    xf: 0.5,
    ...overrides,
  };
}

describe("ddj-400-led-sync", () => {
  beforeEach(() => {
    sendMidiOutput.mockClear();
    resetDdj400LedCache();
  });

  test("PFL do deck B acende 0x54 e 0x68 no canal do deck B", () => {
    syncDdj400Leds(baseSnap({ b: { ...baseSnap().b, cueMonitor: true } }));

    expect(sendMidiOutput).toHaveBeenCalledWith([DDJ_STATUS.noteDeckB, DECK_NOTE.pfl, 0x7f]);
    expect(sendMidiOutput).toHaveBeenCalledWith([DDJ_STATUS.noteDeckB, DECK_NOTE.pflDeckB, 0x7f]);
  });

  test("delta evita reenviar LED que não mudou", () => {
    const snap = baseSnap({ masterCue: true });
    syncDdj400Leds(snap);
    sendMidiOutput.mockClear();

    syncDdj400Leds(snap);

    expect(sendMidiOutput).not.toHaveBeenCalled();
  });

  test("MASTER CUE usa o canal do browser", () => {
    syncDdj400Leds(baseSnap({ masterCue: true }));

    expect(sendMidiOutput).toHaveBeenCalledWith([DDJ_STATUS.noteBrowser, MIXER_NOTE.masterCue, 0x7f]);
  });
});
