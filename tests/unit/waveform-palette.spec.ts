import { describe, expect, it } from "vitest";
import { getCamelotKey } from "../../src/lib/musical-key";
import {
  DEFAULT_WAVEFORM_ACCENT,
  deriveWaveformPalette,
  deriveWaveformPaletteFromKey,
  hexToRgb,
  mixHex,
  resolveWaveformLayerRgb,
} from "../../src/lib/waveform-palette";

describe("deriveWaveformPalette", () => {
  it("mantém o matiz médio como âncora Camelot com saturação neon", () => {
    const palette = deriveWaveformPalette("#f5b04a");
    expect(hueDistance(palette.mids, "#f5b04a")).toBeLessThan(6);
    const midsRgb = hexToRgb(palette.mids)!;
    const [, midsS] = (() => {
      const [r, g, b] = midsRgb;
      const rn = r / 255;
      const gn = g / 255;
      const bn = b / 255;
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const delta = max - min;
      const s = delta === 0 ? 0 : (delta / (1 - Math.abs(2 * (max + min) / 2 - 1))) * 100;
      return [0, s];
    })();
    expect(midsS).toBeGreaterThan(75);
  });

  it("ordena luminosidade grave < médio < agudo", () => {
    const palette = deriveWaveformPalette("#2ad4b0", "B");
    const parseL = (hex: string) => {
      const r = Number.parseInt(hex.slice(1, 3), 16);
      const g = Number.parseInt(hex.slice(3, 5), 16);
      const b = Number.parseInt(hex.slice(5, 7), 16);
      return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
    };
    expect(parseL(palette.bass)).toBeLessThan(parseL(palette.mids));
    expect(parseL(palette.mids)).toBeLessThan(parseL(palette.highs));
  });

  it("diferencia menor e maior na mesma hora", () => {
    const minor = deriveWaveformPalette("#f5b04a", "A");
    const major = deriveWaveformPalette("#f5b04a", "B");
    expect(minor.bass).not.toBe(major.bass);
    expect(minor.highs).not.toBe(major.highs);
  });

  it("usa fallback neon neutro para hex inválido", () => {
    const palette = deriveWaveformPalette("invalid");
    const fallback = deriveWaveformPalette(DEFAULT_WAVEFORM_ACCENT);
    expect(palette.mids.toLowerCase()).toBe(fallback.mids.toLowerCase());
  });
});

describe("mixHex", () => {
  it("interpola entre duas cores", () => {
    expect(mixHex("#000000", "#ffffff", 0.5).toLowerCase()).toBe("#808080");
  });

  it("sempre devolve hex válido para o canvas", () => {
    const mixed = mixHex("#f5b04a", "#04060b", 0.94);
    expect(mixed).toMatch(/^#[0-9a-f]{6}$/i);
    expect(mixed).not.toContain("-");
  });
});

describe("deriveWaveformPalette — matiz extrema", () => {
  it("não gera cores inválidas perto de 360°", () => {
    const palette = deriveWaveformPalette("#ff2244", "B");
    for (const color of [palette.bass, palette.mids, palette.highs]) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(color).not.toContain("-");
    }
  });
});

function hueOf(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [rn, gn, bn] = rgb.map((channel) => channel / 255) as [number, number, number];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === rn) hue = ((gn - bn) / delta) % 6;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

function hueDistance(left: string, right: string): number {
  const delta = Math.abs(hueOf(left) - hueOf(right)) % 360;
  return Math.min(delta, 360 - delta);
}

describe("deriveWaveformPaletteFromKey", () => {
  it("ancora o corpo da onda no matiz da hora Camelot da faixa", () => {
    const palette = deriveWaveformPaletteFromKey("8A");
    expect(hueDistance(palette.mids, "#f5b04a")).toBeLessThan(6);
  });

  it("pinta o grave com a hora anterior e o agudo com a seguinte", () => {
    const palette = deriveWaveformPaletteFromKey("8A");
    const hour7 = getCamelotKey("7A")!.color;
    const hour9 = getCamelotKey("9A")!.color;
    expect(hueDistance(palette.bass, hour7)).toBeLessThan(hueDistance(palette.bass, hour9));
    expect(hueDistance(palette.highs, hour9)).toBeLessThan(hueDistance(palette.highs, hour7));
  });

  it("separa menor e maior na mesma hora", () => {
    const minor = deriveWaveformPaletteFromKey("8A");
    const major = deriveWaveformPaletteFromKey("8B");
    expect(minor.bass).not.toBe(major.bass);
    expect(minor.highs).not.toBe(major.highs);
  });

  it("resolve RGB distinctos para horas distantes", () => {
    const orange = resolveWaveformLayerRgb("8A");
    const teal = resolveWaveformLayerRgb("4B");
    expect(orange.mids).not.toEqual(teal.mids);
    expect(orange.mono).toEqual(orange.mids);
  });
});
