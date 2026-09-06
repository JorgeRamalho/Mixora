import { describe, expect, it } from "vitest";
import {
  KNOB_ARC_START_DEG,
  dialDeg,
  formatKnobPercent,
  visualNorm,
} from "../../src/components/mixer/rotary-knob-scale";

describe("rotary-knob-scale", () => {
  it("mapeia o mínimo do trim em 0% visual e no início do arco", () => {
    expect(visualNorm(0.2, 0.2, 1)).toBe(0);
    expect(dialDeg(0)).toBe(KNOB_ARC_START_DEG);
    expect(formatKnobPercent(0.2, 0.2, 1)).toBe("0%");
  });

  it("mapeia o máximo do trim em 100% visual e no fim do arco", () => {
    expect(visualNorm(1, 0.2, 1)).toBe(1);
    expect(dialDeg(1)).toBe(135);
    expect(formatKnobPercent(1, 0.2, 1)).toBe("100%");
  });

  it("mantém o detent bipolar no meio do arco", () => {
    expect(visualNorm(0, -100, 100)).toBe(0.5);
    expect(dialDeg(0.5)).toBe(0);
  });
});
