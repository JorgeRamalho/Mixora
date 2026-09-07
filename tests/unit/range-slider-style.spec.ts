import { describe, expect, it } from "vitest";
import {
  crossfaderSliderStyle,
  pitchSliderStyle,
} from "../../src/lib/range-slider-style";

describe("range-slider-style", () => {
  it("mapeia o crossfader de 0 a 100% na trilha", () => {
    expect(crossfaderSliderStyle(0)).toEqual({ "--range-pct": "0%" });
    expect(crossfaderSliderStyle(0.5)).toEqual({ "--range-pct": "50%" });
    expect(crossfaderSliderStyle(1)).toEqual({ "--range-pct": "100%" });
  });

  it("limita o crossfader fora do intervalo 0–1", () => {
    expect(crossfaderSliderStyle(-0.2)).toEqual({ "--range-pct": "0%" });
    expect(crossfaderSliderStyle(1.5)).toEqual({ "--range-pct": "100%" });
  });

  it("preenche o pitch do centro até o thumb acima do detent", () => {
    expect(pitchSliderStyle(0)).toEqual({
      "--range-pct": "50%",
      "--fill-start": "50%",
      "--fill-end": "50%",
      "--range-center": "50%",
    });

    expect(pitchSliderStyle(-8)).toEqual({
      "--range-pct": "0%",
      "--fill-start": "0%",
      "--fill-end": "50%",
      "--range-center": "50%",
    });
  });

  it("preenche o pitch do centro até o thumb abaixo do detent", () => {
    expect(pitchSliderStyle(8)).toEqual({
      "--range-pct": "100%",
      "--fill-start": "50%",
      "--fill-end": "100%",
      "--range-center": "50%",
    });
  });
});
