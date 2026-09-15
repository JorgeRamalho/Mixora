import { describe, expect, it } from "vitest";
import { getCamelotKey } from "../../src/lib/musical-key";
import {
  mixerStagePaletteCssVars,
  resolveMixerStagePalette,
} from "../../src/lib/mixer-stage-palette";
import { DEFAULT_WAVEFORM_ACCENT, mixHex } from "../../src/lib/waveform-palette";

const COLOR_8A = getCamelotKey("8A")!.color;
const COLOR_10A = getCamelotKey("10A")!.color;

describe("resolveMixerStagePalette", () => {
  it("usa a hora do deck que está tocando", () => {
    const onlyA = resolveMixerStagePalette({
      keyA: "8A",
      keyB: "10A",
      playingA: true,
      playingB: false,
      crossfader: 1,
    });
    expect(onlyA.camelotA.toLowerCase()).toBe(COLOR_8A.toLowerCase());
    expect(onlyA.camelotB.toLowerCase()).toBe(COLOR_10A.toLowerCase());
    expect(onlyA.camelotLive.toLowerCase()).toBe(COLOR_8A.toLowerCase());
    expect(onlyA.playing).toBe(true);

    const onlyB = resolveMixerStagePalette({
      keyA: "8A",
      keyB: "10A",
      playingA: false,
      playingB: true,
      crossfader: 0,
    });
    expect(onlyB.camelotLive.toLowerCase()).toBe(COLOR_10A.toLowerCase());
  });

  it("mistura as duas horas pelo crossfader quando os dois decks tocam", () => {
    const left = resolveMixerStagePalette({
      keyA: "8A",
      keyB: "10A",
      playingA: true,
      playingB: true,
      crossfader: 0,
    });
    expect(left.camelotLive.toLowerCase()).toBe(COLOR_8A.toLowerCase());

    const right = resolveMixerStagePalette({
      keyA: "8A",
      keyB: "10A",
      playingA: true,
      playingB: true,
      crossfader: 1,
    });
    expect(right.camelotLive.toLowerCase()).toBe(COLOR_10A.toLowerCase());

    const center = resolveMixerStagePalette({
      keyA: "8A",
      keyB: "10A",
      playingA: true,
      playingB: true,
      crossfader: 0.5,
    });
    expect(center.camelotLive.toLowerCase()).toBe(mixHex(COLOR_8A, COLOR_10A, 0.5).toLowerCase());
  });

  it("pausa com mistura 50/50 e playing falso", () => {
    const paused = resolveMixerStagePalette({
      keyA: "8A",
      keyB: "10A",
      playingA: false,
      playingB: false,
      crossfader: 0.2,
    });
    expect(paused.playing).toBe(false);
    expect(paused.camelotLive.toLowerCase()).toBe(mixHex(COLOR_8A, COLOR_10A, 0.5).toLowerCase());
  });

  it("cai no neutro quando o tom não é Camelot", () => {
    const palette = resolveMixerStagePalette({
      keyA: "not-a-key",
      keyB: "",
      playingA: true,
      playingB: false,
      crossfader: 0.5,
    });
    expect(palette.camelotLive.toLowerCase()).toBe(DEFAULT_WAVEFORM_ACCENT.toLowerCase());
  });
});

describe("mixerStagePaletteCssVars", () => {
  it("expõe as três custom properties do palco", () => {
    const palette = resolveMixerStagePalette({
      keyA: "8A",
      keyB: "10A",
      playingA: true,
      playingB: false,
      crossfader: 0,
    });
    expect(mixerStagePaletteCssVars(palette)).toEqual({
      "--camelot-a": palette.camelotA,
      "--camelot-b": palette.camelotB,
      "--camelot-live": palette.camelotLive,
    });
  });
});
