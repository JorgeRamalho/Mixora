import type { CamelotLetter } from "../types/harmony";
import { getCamelotKey, wrapCamelotHour } from "./musical-key";

/** Cor neutra quando o tom Camelot não está disponível. */
export const DEFAULT_WAVEFORM_ACCENT = "#8b8fa8";

/** Três tons espectrais derivados da cor Camelot da faixa. */
export type WaveformPalette = {
  bass: string;
  mids: string;
  highs: string;
};

/** Opacidade por camada no blend neon aditivo. */
export const WAVEFORM_LAYER_OPACITY = {
  highs: 0.92,
  mids: 0.86,
  bass: 0.8,
} as const;

/**
 * Normaliza `#RRGGBB` em minúsculas.
 *
 * @param hex Cor hexadecimal com ou sem `#`.
 */
function normalizeHex(hex: string): string | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Converte `#RRGGBB` em componentes RGB 0–255 para o canvas.
 *
 * @param hex Cor hexadecimal com ou sem `#`.
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  return parseHex(hex);
}

/**
 * Converte `#RRGGBB` em componentes RGB 0–255.
 *
 * @param hex Cor hexadecimal com ou sem `#`.
 */
function parseHex(hex: string): [number, number, number] | null {
  const normalized = hex.trim().replace(/^#/, "");
  if (normalized.length === 3) {
    const r = Number.parseInt(normalized[0]! + normalized[0], 16);
    const g = Number.parseInt(normalized[1]! + normalized[1], 16);
    const b = Number.parseInt(normalized[2]! + normalized[2], 16);
    return [r, g, b];
  }
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return [r, g, b];
}

/**
 * Limita um valor numérico ao intervalo indicado.
 *
 * @param value Valor de entrada.
 * @param min Limite inferior.
 * @param max Limite superior.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Normaliza matiz HSL para o intervalo 0–360 graus.
 *
 * @param hue Matiz em graus, possivelmente fora do intervalo.
 */
function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

/**
 * Converte componentes RGB 0–255 em `#RRGGBB` seguro para canvas.
 *
 * @param r Vermelho 0–255.
 * @param g Verde 0–255.
 * @param b Azul 0–255.
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) =>
    clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converte RGB 0–255 para HSL com matiz em graus e saturação/luminosidade em %.
 *
 * @param r Vermelho 0–255.
 * @param g Verde 0–255.
 * @param b Azul 0–255.
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return [h, s * 100, l * 100];
}

/**
 * Converte HSL para `#RRGGBB`.
 *
 * @param h Matiz em graus.
 * @param s Saturação em %.
 * @param l Luminosidade em %.
 */
function hslToHex(h: number, s: number, l: number): string {
  const hue = normalizeHue(h);
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = ln - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (hue < 60) [rn, gn, bn] = [c, x, 0];
  else if (hue < 120) [rn, gn, bn] = [x, c, 0];
  else if (hue < 180) [rn, gn, bn] = [0, c, x];
  else if (hue < 240) [rn, gn, bn] = [0, x, c];
  else if (hue < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  return rgbToHex((rn + m) * 255, (gn + m) * 255, (bn + m) * 255);
}

/**
 * Mistura duas cores hex em RGB.
 *
 * @param a Cor base.
 * @param b Cor de mistura.
 * @param ratio Peso de `b` entre 0 e 1.
 */
export function mixHex(a: string, b: string, ratio: number): string {
  const rgbA = parseHex(a) ?? parseHex(DEFAULT_WAVEFORM_ACCENT)!;
  const rgbB = parseHex(b) ?? parseHex(DEFAULT_WAVEFORM_ACCENT)!;
  const t = clamp(ratio, 0, 1);
  const mix = rgbA.map((channel, index) =>
    Math.round(channel * (1 - t) + (rgbB[index] ?? channel) * t),
  ) as [number, number, number];
  return rgbToHex(...mix);
}

/**
 * Empurra uma cor Camelot para o espectro neon do Cavasik.
 *
 * @param hex Cor de partida.
 * @param saturation Saturação alvo em %.
 * @param lightness Luminosidade alvo em %.
 */
export function toNeonHex(hex: string, saturation = 92, lightness = 58): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [h, s] = rgbToHsl(...rgb);
  return hslToHex(h, Math.max(s, saturation), lightness);
}

/**
 * Deriva paleta espectral grave/médio/agudo no estilo neon Cavasik.
 *
 * @param camelotHex Cor base da hora Camelot.
 * @param letter `A` menor ou `B` maior para nuance harmônica.
 */
export function deriveWaveformPalette(
  camelotHex: string,
  letter?: CamelotLetter | null,
): WaveformPalette {
  const normalized = normalizeHex(camelotHex);
  if (!normalized) {
    return deriveWaveformPalette(DEFAULT_WAVEFORM_ACCENT, letter);
  }
  const mids = normalized;
  const rgb = parseHex(mids)!;
  const [h, s] = rgbToHsl(...rgb);

  let bassH = normalizeHue(h - 32);
  let bassS = clamp(s + 28, 78, 100);
  let bassL = letter === "A" ? 46 : 50;
  let midsS = clamp(s + 22, 80, 100);
  let midsL = 58;
  let highsH = normalizeHue(h + 32);
  let highsS = clamp(s + 14, 72, 100);
  let highsL = letter === "A" ? 66 : 72;

  if (letter === "A") {
    bassH = normalizeHue(bassH - 8);
    highsH = normalizeHue(highsH - 4);
    highsL = 64;
  } else if (letter === "B") {
    bassL = 52;
    highsH = normalizeHue(highsH + 6);
    highsL = 74;
  }

  return {
    bass: hslToHex(bassH, bassS, bassL),
    mids: hslToHex(h, midsS, midsL),
    highs: hslToHex(highsH, highsS, highsL),
  };
}

/**
 * Paleta da onda a partir do código Camelot: grave na hora anterior, corpo na atual, agudo na seguinte.
 *
 * @param code Código `8A` ou equivalente, já normalizado ou não
 */
export function deriveWaveformPaletteFromKey(code: string | null | undefined): WaveformPalette {
  const key = code ? getCamelotKey(code) : undefined;
  if (!key) return deriveWaveformPalette(DEFAULT_WAVEFORM_ACCENT);
  const prev = getCamelotKey(`${wrapCamelotHour(key.hour - 1)}${key.letter}`);
  const next = getCamelotKey(`${wrapCamelotHour(key.hour + 1)}${key.letter}`);
  const isMinor = key.letter === "A";
  const bassMix = mixHex(key.color, prev?.color ?? key.color, 0.62);
  const highsMix = mixHex(key.color, next?.color ?? key.color, 0.55);
  return {
    bass: toNeonHex(bassMix, 94, isMinor ? 46 : 50),
    mids: toNeonHex(key.color, 92, 58),
    highs: toNeonHex(highsMix, 88, isMinor ? 66 : 72),
  };
}

const FALLBACK_RGB: [number, number, number] = [139, 143, 168];

/**
 * RGB das camadas overlapping a partir do tom soando no deck.
 *
 * @param camelotKey Código Camelot da faixa ou do KEY SYNC
 * @param accentHex Cor de fallback quando o código não resolve
 */
export function resolveWaveformLayerRgb(
  camelotKey?: string | null,
  accentHex?: string | null,
): Record<"bass" | "mids" | "highs" | "mono", [number, number, number]> {
  const palette =
    camelotKey && getCamelotKey(camelotKey)
      ? deriveWaveformPaletteFromKey(camelotKey)
      : deriveWaveformPalette(accentHex ?? DEFAULT_WAVEFORM_ACCENT);
  const mids = hexToRgb(palette.mids) ?? FALLBACK_RGB;
  return {
    bass: hexToRgb(palette.bass) ?? FALLBACK_RGB,
    mids,
    highs: hexToRgb(palette.highs) ?? FALLBACK_RGB,
    mono: mids,
  };
}

/**
 * Pinta fundo escuro com glow sutil da cor Camelot.
 *
 * @param ctx Contexto 2D do canvas visível.
 * @param width Largura CSS do canvas.
 * @param height Altura CSS do canvas.
 * @param accentColor Cor Camelot da faixa.
 */
export function paintWaveformBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  accentColor: string,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) * 0.78;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, mixHex(accentColor, "#000000", 0.9));
  gradient.addColorStop(0.45, mixHex(accentColor, "#020208", 0.97));
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
